import { method, NotFoundError, ServerError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getOutput } from "../../Models/Output";
import { getSadoEntry, SadoDocument } from "../../Models/Sado";
import { getOrder } from "../../Models/SadoOrders";
import { parseLocation } from "../../Models/SadoOrders/Utilities/ParseLocation";
import { validateOrderSignature } from "../../Models/SadoOrders/Utilities/ValidateSignature";
import { ipfs } from "../../Services/IPFS";
import { decodePsbt, getPsbtAsJSON } from "../../Utilities/PSBT";

export const getSadoStatus = method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const entry = await getSadoEntry({ cid });
    if (entry === undefined) {
      throw new NotFoundError();
    }
    if (entry.type === "order") {
      return getOrderStatus(entry);
    }
    if (entry.type === "offer") {
      return getOfferStatus(entry);
    }
    throw new ServerError(-32001, "Unknown sado entry type");
  },
});

async function getOrderStatus(entry: SadoDocument) {
  const data = await ipfs.getOrder(entry.cid);
  if ("error" in data) {
    throw new NotFoundError("Order no longer exist on IPFS");
  }

  try {
    validateOrderSignature(data);
  } catch (error) {
    return {
      type: "order",
      status: "rejected",
      reason: error.message,
    };
  }

  const order = await getOrder(entry.cid);
  if (order !== undefined) {
    delete (order as any)._id;
    return {
      type: "order",
      status: "pending",
      order,
      ipfs: data,
    };
  }

  const [txid, n] = parseLocation(data.location);

  const output = await getOutput({ "vout.txid": txid, "vout.n": n });
  if (output === undefined) {
    return {
      type: "order",
      status: "rejected",
      reason: "Order location does not exist",
    };
  }

  if (output.vin !== undefined) {
    return {
      type: "order",
      status: "resolved",
      receiver: `${output.vin.txid}:${output.vin.n}`,
    };
  }

  return {
    type: "order",
    status: "unknown",
    message: "Order is in an unknown state",
  };
}

async function getOfferStatus(entry: SadoDocument) {
  const data = await ipfs.getOffer(entry.cid);
  if ("error" in data) {
    throw new NotFoundError("Offer no longer exist on IPFS");
  }

  // ### Validate Offer PSBT

  const psbt = await decodePsbt(data.offer);
  if (psbt === undefined) {
    return {
      type: "offer",
      status: "rejected",
      reason: "Invalid offer PSBT",
    };
  }

  const offer = getPsbtAsJSON(psbt);
  const input = offer.inputs[0];
  if (input === undefined) {
    return {
      type: "offer",
      status: "rejected",
      reason: "Offer PSBT has no inputs",
    };
  }

  const order = await ipfs.getOrder(data.origin);
  if ("error" in order) {
    return {
      type: "offer",
      status: "rejected",
      reason: "Order no longer exist on IPFS",
    };
  }

  if (input.location !== order.location) {
    return {
      type: "offer",
      status: "rejected",
      reason: "Offer PSBT does not spend order location from first input",
    };
  }

  const orderOutput = await getOutput({ "vout.txid": input.txid, "vout.n": input.vout });
  if (orderOutput === undefined) {
    return {
      type: "offer",
      status: "rejected",
      reason: "Order location does not exist",
    };
  }

  if (orderOutput.vin !== undefined) {
    const receiver = await getOutput({ "vout.txid": orderOutput.vin.txid, "vout.n": orderOutput.vin.n });
    if (receiver === undefined) {
      return {
        type: "offer",
        status: "rejected",
        reason: "Receiver of order location does not exist",
      };
    }
    if (receiver.addresses.includes(data.taker) === false) {
      return {
        type: "offer",
        status: "rejected",
        reason: "Order was resolved by another taker",
      };
    }
    return {
      type: "offer",
      status: "resolved",
      order: {
        maker: order.maker,
        location: order.location,
      },
      offer: {
        txid: entry.txid,
        taker: data.taker,
        location: `${orderOutput.vin.txid}:${orderOutput.vin.n}`,
      },
    };
  }

  for (const input of offer.inputs) {
    const output = await getOutput({ "vout.txid": input.txid, "vout.n": input.vout });
    if (output === undefined) {
      return {
        type: "offer",
        status: "rejected",
        reason: "Input on offer PSBT does not exist on chain",
        input,
      };
    }
    if (output.vin !== undefined) {
      return {
        type: "offer",
        status: "rejected",
        reason: "Input on offer PSBT has already been spent",
        receiver: `${output.vin.txid}:${output.vin.n}`,
        input,
      };
    }
  }

  const sadoOrder = await getOrder(data.origin);
  if (sadoOrder !== undefined) {
    return {
      type: "offer",
      status: "pending",
      order: sadoOrder,
    };
  }

  return {
    type: "offer",
    status: "unknown",
    message: "Offer is in an unknown state",
  };
}

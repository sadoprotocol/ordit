import { ipfs } from "../../../Services/IPFS";
import { decodePsbt, getPsbtAsJSON } from "../../../Utilities/PSBT";
import { decodeRawTransaction } from "../../../Utilities/Transaction";
import { outputs } from "../../Output";
import { SadoDocument } from "../Events/Collection";
import { orders } from "../Orders/Methods";

export async function getOfferStatus(entry: SadoDocument) {
  const data = await ipfs.getOffer(entry.cid);
  if ("error" in data) {
    return status("ipfs-error", data);
  }

  // ### Validate Offer PSBT

  const psbt = decodePsbt(data.offer);
  if (psbt === undefined) {
    if (decodeRawTransaction(data.offer) !== undefined) {
      return status("rejected", { reason: "Offer is a raw transaction, expected PSBT" });
    }
    return status("rejected", { reason: "Invalid offer PSBT", psbt });
  }

  const offer = getPsbtAsJSON(psbt);
  const input = offer.inputs[0];
  if (input === undefined) {
    return status("rejected", { reason: "Offer PSBT has no inputs" });
  }

  const order = await ipfs.getOrder(data.origin);
  if ("error" in order) {
    return status("rejected", { reason: "Order no longer exist on IPFS" });
  }

  if (input.location !== order.location) {
    return status("rejected", { reason: "Offer PSBT does not spend order location in first input" });
  }

  const orderOutput = await outputs.findOne({ "vout.txid": input.txid, "vout.n": input.vout });
  if (orderOutput === undefined) {
    return status("rejected", { reason: "Order location does not exist" });
  }

  if (orderOutput.vin !== undefined && orderOutput.vin !== null) {
    const receiver = await outputs.findOne({ "vout.txid": orderOutput.vin.txid, "vout.n": orderOutput.vin.n });
    if (receiver === undefined) {
      return status("rejected", { reason: "Receiver of order location does not exist" });
    }
    if (receiver.addresses.includes(data.taker) === false) {
      return status("rejected", { reason: "Order location has been spent by another taker" });
    }
    return status("resolved", {
      order: {
        maker: order.maker,
        location: order.location,
      },
      offer: {
        txid: entry.txid,
        taker: data.taker,
        location: `${orderOutput.vin.txid}:${orderOutput.vin.n}`,
      },
    });
  }

  for (const input of offer.inputs) {
    const output = await outputs.findOne({ "vout.txid": input.txid, "vout.n": input.vout });
    if (output === undefined) {
      return status("rejected", { reason: "Input on offer PSBT does not exist", input });
    }
    if (output.vin !== undefined && output.vin !== null) {
      return status("rejected", {
        reason: "Input on offer PSBT has already been spent",
        receiver: `${output.vin.txid}:${output.vin.n}`,
        input,
      });
    }
  }

  const sadoOrder = await orders.findOne({ cid: data.origin });
  if (sadoOrder !== undefined) {
    return status("pending", { order: sadoOrder, offer: data });
  }

  return status("unknown", { message: "Offer is in an unknown state" });
}

function status(status: string, data: any) {
  return {
    type: "offer",
    status,
    ...data,
  };
}

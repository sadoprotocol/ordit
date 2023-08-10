import { ipfs } from "../../../Services/IPFS";
import { db } from "../..";
import { SadoDocument } from "../../Sado";
import { parseLocation } from "./ParseLocation";
import { validateOrderSignature } from "./ValidateSignature";

export async function getOrderStatus(entry: SadoDocument) {
  const data = await ipfs.getOrder(entry.cid);
  if ("error" in data) {
    return status("ipfs-error", data);
  }

  try {
    validateOrderSignature(data);
  } catch (error) {
    return status("rejected", { reason: error.message });
  }

  const order = await db.orders.findOne({ cid: entry.cid });
  if (order !== undefined) {
    // rome-ignore lint/suspicious/noExplicitAny: reason
    // rome-ignore lint/performance/noDelete: reason
    delete (order as any)._id;
    return status("pending", { order, ipfs: data });
  }

  const [txid, n] = parseLocation(data.location);

  const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
  if (output === undefined) {
    return status("rejected", { reason: "Order location does not exist" });
  }

  if (output.vin !== undefined) {
    return status("resolved", { receiver: `${output.vin.txid}:${output.vin.n}` });
  }

  return status("unknown", { message: "Order is in an unknown state" });
}

// rome-ignore lint/suspicious/noExplicitAny: reason
function status(status: string, data: any) {
  return {
    type: "order",
    status,
    ...data,
  };
}

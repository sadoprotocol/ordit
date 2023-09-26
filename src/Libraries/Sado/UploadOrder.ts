import { IPFSOrder } from "../../Database/IPFS";
import { ipfs } from "../../Services/IPFS";
import { OrderParams } from "./CreateOrderPsbt";

export async function uploadOrder(params: OrderParams): Promise<string> {
  const { cid } = await ipfs.uploadJson<Omit<IPFSOrder, "cid">>(getOrderIPFS(params));
  return cid;
}

export function getOrderIPFS(params: OrderParams): Omit<IPFSOrder, "cid"> {
  return {
    ts: params.order.ts,
    type: params.order.type,
    location: params.order.location,
    maker: params.order.maker,
    cardinals: params.order.cardinals,
    instant: params.order.instant,
    expiry: params.order.expiry,
    satoshi: params.order.satoshi,
    meta: params.order.meta,
    orderbooks: params.order.orderbooks,
    signature: params.signature.value,
    signature_format: params.signature.format,
    desc: params.signature.desc,
    pubkey: params.signature.pubkey,
  };
}

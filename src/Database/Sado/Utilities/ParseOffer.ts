import { events } from "../Events/Methods";
import { orders } from "../Orders/Methods";
import { getOfferStatus } from "./GetOfferStatus";

export async function parseOffer(cid: string, block: Block) {
  const entry = await events.findOne({ cid });
  if (entry === undefined) {
    return;
  }

  const status = await getOfferStatus(entry);
  if (status.status !== "pending") {
    return;
  }

  // ### Add Offer

  await orders.addOffer(status.order.cid, {
    cid,
    origin: status.offer.origin,
    taker: status.offer.taker,
    offer: status.offer.offer,
    block,
  });
}

type Block = {
  hash: string;
  height: number;
  time: number;
  txid: string;
};

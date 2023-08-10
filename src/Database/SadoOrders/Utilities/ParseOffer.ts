import { db } from "../..";
import { getOfferStatus } from "./GetOfferStatus";

export async function parseOffer(cid: string, block: Block) {
  const entry = await db.sado.findOne({ cid });
  if (entry === undefined) {
    return;
  }

  const {
    status,
    order,
    offer: { origin, taker, offer },
  } = await getOfferStatus(entry);
  if (status !== "pending") {
    return;
  }

  // ### Add Offer

  await db.orders.addOffer(order.cid, { cid, origin, taker, offer, block });
}

type Block = {
  hash: string;
  height: number;
  time: number;
  txid: string;
};

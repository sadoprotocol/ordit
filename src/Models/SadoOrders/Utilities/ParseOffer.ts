import { ipfs } from "../../../Services/IPFS";
import { decodePsbt, getPsbtAsJSON } from "../../../Utilities/PSBT";
import { getOutput } from "../../Output";
import { addOffer, getOrder } from "../Methods";
import { parseLocation } from "./ParseLocation";

export async function parseOffer(cid: string, block: Block) {
  const offer = await ipfs.getOffer(cid);
  if ("error" in offer) {
    return;
  }

  // ### Get Order

  const order = await getOrder(offer.origin);
  if (order === undefined) {
    return;
  }

  const [orderTxid, orderVout] = parseLocation(order.location);

  // ### Validate Offer

  const psbt = decodePsbt(offer.offer);
  if (psbt === undefined) {
    return;
  }

  const data = getPsbtAsJSON(psbt);

  // ### Ordinal Input
  // Verify that the first input is the order being transfered.

  const input = data.inputs[0];
  if (input.txid !== orderTxid || input.vout !== orderVout) {
    return;
  }

  // ### Spents Check
  // Go through all the inputs and ensure that none of them have been spent.

  for (const input of data.inputs) {
    const output = await getOutput({ "vout.txid": input.txid, "vout.n": input.vout });
    if (output !== undefined && output.vin !== undefined) {
      return;
    }
  }

  // ### Add Offer

  await addOffer(order.cid, {
    cid,
    origin: offer.origin,
    taker: offer.taker,
    offer: offer.offer,
    block,
  });
}

type Block = {
  hash: string;
  height: number;
  time: number;
  txid: string;
};

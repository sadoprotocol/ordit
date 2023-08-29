import { log } from "../../../Workers/Log";
import { Inscription } from "../../Inscriptions";
import { mints } from "../Mints/Methods";
import { TokenTransferedEvent } from "../Utilities";
import { collection } from "./Collection";

export const transfers = {
  transfer,
};

async function transfer(event: TokenTransferedEvent, inscription: Inscription) {
  const transfer = await collection.findOne({ inscription: inscription.id });
  if (transfer !== null) {
    await collection.updateOne({ _id: transfer._id }, { $set: { address: inscription.owner } });
  }

  // ### Validate Transfer
  // Transfers are only validated on creation, once a transfer is validated
  // the act of it moving from one address to another does not need further
  // validation.

  const mint = await mints.findOne({ address: inscription.creator });

  if (mint === undefined) {
    return log(`  🚫 address ${inscription.creator} has no minted balance\n`);
  }

  if (mint.balance < event.amt) {
    return log(`  🚫 not enough balance\n`);
  }

  await mints.updateOne({ address: mint.address }, { $inc: { balance: -event.amt } });

  return collection.insertOne({
    tick: event.tick,
    inscription: inscription.id,
    amount: event.amt,
    address: inscription.owner,
  });
}

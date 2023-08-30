import { getLocationFromId } from "../../../Utilities/Inscriptions";
import { Inscription } from "../../Inscriptions";
import { OutputDocument, outputs } from "../../Output";
import { accounts } from "../Accounts/Methods";
import { TokenTransferedEvent } from "../Utilities";
import { collection } from "./Collection";

export const transfers = {
  collection,
  transfer,
};

/**
 * Handle transfer event for a token.
 *
 * @param event       - Transfer event.
 * @param inscription - Inscription the transfer was created under.
 */
async function transfer(event: TokenTransferedEvent, inscription: Inscription) {
  const [txid, n] = getLocationFromId(inscription.id);
  const sender = await outputs.getByLocation(txid, n);
  if (sender === undefined) {
    return; // somehow we could not find the inscriptions output
  }

  // ### Create Transfer
  // When the transfer event is handled we create a new transfer record if the
  // transfer request is valid.

  const transfer = await collection.findOne({ inscription: inscription.id });
  if (transfer !== null) {
    if (transfer.receiver !== undefined) {
      return; // transfer has already been handled
    }
    return sendTransfer(sender, event, inscription);
  }

  const account = await accounts.getTokenBalance(sender.addresses[0], event.tick);
  if (event.amt > account.available) {
    return; // not enough available balance for transfer event
  }

  await accounts.addTransferableBalance(sender.addresses[0], event.tick, event.amt);

  await collection.insertOne({
    token: event.tick,
    inscription: inscription.id,
    amount: event.amt,
    sender: sender.addresses[0],
  });

  // ### Spent Check
  // If the inscription genesis transaction output has been spent, we transfer
  // the funds to the output recipient.

  await sendTransfer(sender, event, inscription);
}

async function sendTransfer(sender: OutputDocument, event: TokenTransferedEvent, inscription: Inscription) {
  if (sender.vin !== undefined) {
    const recipient = await outputs.getByLocation(sender.vin.txid, sender.vin.n);
    if (recipient === undefined) {
      return; // somehow we could not find the inscriptions recipient
    }
    await collection.updateOne({ inscription: inscription.id }, { $set: { receiver: recipient.addresses[0] } });
    await accounts.sendTransferableBalance(sender.addresses[0], recipient.addresses[0], event.tick, event.amt);
  }
}

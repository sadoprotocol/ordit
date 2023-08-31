import { FindPaginatedParams, paginate } from "../../../Libraries/Paginate";
import { getLocationFromId } from "../../../Utilities/Inscriptions";
import { Inscription } from "../../Inscriptions";
import { OutputDocument, outputs } from "../../Output";
import { accounts } from "../Accounts/Methods";
import { TokenTransferedEvent } from "../Utilities";
import { collection, TokenTransfer } from "./Collection";

export const transfers = {
  collection,
  transfer,
  findPaginated,
};

/**
 * Handle transfer event for a token.
 *
 * @param event       - Transfer event.
 * @param inscription - Inscription the transfer was created under.
 */
async function transfer(event: TokenTransferedEvent, inscription: Inscription) {
  const [txid, n] = getLocationFromId(inscription.id);
  const from = await outputs.getByLocation(txid, n);
  if (from === undefined) {
    return; // somehow we could not find the inscriptions output
  }

  // ### Create Transfer
  // When the transfer event is handled we create a new transfer record if the
  // transfer request is valid.

  const transfer = await collection.findOne({ inscription: inscription.id });
  if (transfer !== null) {
    if (transfer.to !== undefined) {
      return; // transfer has already been handled
    }
    return sendTransfer(from, event, inscription);
  }

  const account = await accounts.getTokenBalance(from.addresses[0], event.tick);
  if (event.amt > account.available) {
    return; // not enough available balance for transfer event
  }

  await accounts.addTransferableBalance(from.addresses[0], event.tick, event.amt);

  await collection.insertOne({
    inscription: inscription.id,
    tick: event.tick,
    amount: event.amt,
    from: from.addresses[0],
    to: null,
    timestamp: inscription.timestamp,
  });

  // ### Spent Check
  // If the inscription genesis transaction output has been spent, we transfer
  // the funds to the output recipient.

  await sendTransfer(from, event, inscription);
}

async function sendTransfer(from: OutputDocument, event: TokenTransferedEvent, inscription: Inscription) {
  if (from.vin !== undefined) {
    const to = await outputs.getByLocation(from.vin.txid, from.vin.n);
    if (to === undefined) {
      return; // somehow we could not find the inscriptions recipient
    }
    await collection.updateOne({ inscription: inscription.id }, { $set: { to: to.addresses[0] } });
    await accounts.sendTransferableBalance(from.addresses[0], to.addresses[0], event.tick, event.amt);
  }
}

async function findPaginated(params: FindPaginatedParams<TokenTransfer> = {}) {
  return paginate.findPaginated(collection, params);
}

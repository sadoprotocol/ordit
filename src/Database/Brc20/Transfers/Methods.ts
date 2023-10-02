import { Filter, FindOptions } from "mongodb";

import { FindPaginatedParams, paginate } from "../../../Libraries/Paginate";
import { rpc } from "../../../Services/Bitcoin";
import { getLocationFromId } from "../../../Utilities/Inscriptions";
import { OutputDocument, outputs } from "../../Output";
import { TokenTransfered } from "../Events/Collection";
import { holders } from "../Holders/Methods";
import { collection, TokenTransfer } from "./Collection";

export const transfers = {
  collection,
  find,
  transfer,
  findPaginated,
};

async function find(filter: Filter<TokenTransfer>, options?: FindOptions<TokenTransfer>) {
  return collection.find(filter, options).toArray();
}

/**
 * Handle transfer event for a token.
 *
 * @param event       - Transfer event.
 * @param inscription - Inscription the transfer was created under.
 */
async function transfer(event: TokenTransfered) {
  const [txid, n] = getLocationFromId(event.meta.inscription);
  const from = await outputs.getByLocation(txid, n);
  if (from === undefined) {
    return; // somehow we could not find the inscriptions output
  }

  // ### Create Transfer
  // When the transfer event is handled we create a new transfer record if the
  // transfer request is valid.

  const transfer = await collection.findOne({ inscription: event.meta.inscription });
  if (transfer !== null) {
    if (transfer.to) {
      console.log("transfer done");
      return; // transfer has already been handled
    }
    return sendTransfer(from, event);
  }

  const balance = await holders.getTokenBalance(from.addresses[0], event.tick);
  if (event.amt > balance.available) {
    return; // not enough available balance for transfer event
  }

  await holders.addTransferableBalance(from.addresses[0], event.tick, event.amt);

  await collection.insertOne({
    inscription: event.meta.inscription,
    tick: event.tick,
    slug: event.tick.toLocaleLowerCase(),
    amount: event.amt,
    from: {
      address: from.addresses[0],
      block: from.vout.block.height,
      timestamp: (await rpc.blockchain.getBlockStats(from.vout.block.height, ["time"])).time,
    },
    to: null,
  });

  // ### Spent Check
  // If the inscription genesis transaction output has been spent, we transfer
  // the funds to the output recipient.

  await sendTransfer(from, event);
}

async function sendTransfer(from: OutputDocument, event: TokenTransfered) {
  if (from.vin !== undefined) {
    const to = await outputs.getByLocation(from.vin.txid, from.vin.n);
    if (to === undefined) {
      return; // somehow we could not find the inscriptions recipient
    }
    await collection.updateOne(
      { inscription: event.meta.inscription },
      {
        $set: {
          to: {
            address: to.addresses[0],
            block: to.vout.block.height,
            timestamp: (await rpc.blockchain.getBlockStats(to.vout.block.height, ["time"])).time,
          },
        },
      },
    );
    await holders.sendTransferableBalance(from.addresses[0], to.addresses[0], event.tick, event.amt);
  }
}

async function findPaginated(params: FindPaginatedParams<TokenTransfer> = {}) {
  return paginate.findPaginated(collection, params);
}

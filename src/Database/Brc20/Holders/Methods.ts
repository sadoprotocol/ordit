import { Filter, FindOptions } from "mongodb";

import { FindPaginatedParams, paginate } from "../../../Libraries/Paginate";
import { collection, TokenHolder } from "./Collection";

export const holders = {
  collection,
  find,
  findPaginated,
  getTokens,
  getTokenBalance,
  addAvailableBalance,
  addTransferableBalance,
  sendTransferableBalance,
};

/**
 * Find holders by filter.
 *
 * @param filter  - MongoDb filter.
 * @param options - MongoDb find options to pass to the find method.
 */
async function find(filter: Filter<TokenHolder>, options?: FindOptions<TokenHolder>) {
  return collection.find(filter, options).toArray();
}

/**
 * Execute a paginated find query.
 *
 * @param params - Pagination params.
 */
async function findPaginated(params: FindPaginatedParams<TokenHolder> = {}) {
  return paginate.findPaginated(collection, params);
}

/**
 * Get all token balances for the given address.
 *
 * @param address - Address to get tokens for.
 */
async function getTokens(address: string) {
  return collection.find({ address }).toArray();
}

/**
 * Get token balance under a given address.
 *
 * Token balance represents the accumulation of all mints that have been
 * made for the account address minus all transfers created for the same
 * address.
 *
 * @param address - Address of the account.
 * @param token   - Tick of the token to get the balance of.
 */
async function getTokenBalance(address: string, tick: string) {
  const balance = await collection.findOne({ address, tick });
  if (balance === null) {
    return { total: 0, available: 0, transferable: 0 };
  }
  return { total: balance.total, available: balance.available, transferable: balance.transferable };
}

/**
 * Add available balance to the account address for the given token and amount.
 *
 * @param address - Account address to add available balance to.
 * @param tick    - Token to add available balance for.
 * @param amount  - Amount to add to the available balance.
 */
async function addAvailableBalance(address: string, tick: string, amount: number) {
  return collection.updateOne(
    { address, tick },
    {
      $setOnInsert: {
        address,
        tick,
        slug: tick.toLowerCase(),
        transferable: 0,
      },
      $inc: {
        total: amount,
        available: amount,
      },
    },
    {
      upsert: true,
    },
  );
}

/**
 * Add transferable balance to the account address with the given token and amount.
 *
 * Transferable balance occurs when a transfer inscription event occurs on chain where
 * the genesis txid matches the outpoint of said inscription.
 *
 * Transferable balance reduces the available balance by the transfer amount but retains
 * the overall balance until the transferable balance has been sent to another address.
 *
 * @param address - Account address to add transferable balance to.
 * @param tick    - Token to add transferable balance for.
 * @param amount  - Amount to add to the transferable balance.
 */
async function addTransferableBalance(address: string, tick: string, amount: number) {
  return collection.updateOne(
    {
      address,
      tick,
    },
    {
      $inc: {
        available: -amount,
        transferable: amount,
      },
    },
  );
}

/**
 * Sends transferable balance from the sender to receiver address with the given token
 * and amount.
 *
 * Send occurs when a transfer inscription event occurs on chain where the genesis txid
 * no longer matches the outpoint of said inscription.
 *
 * Send event of transferable balance decreases both the overall balance of the sender and
 * increases the overall and available balance of the receiver. If the sender and receiver
 * is the same the transferable balance is gets moved back into the available balance.
 *
 * @param sender   - Account address to send transferable balance from.
 * @param receiver - Account address to send transferable balance to.
 * @param tick     - Token to send transferable balance for.
 * @param amount   - Amount to transfer between the parties.
 */
async function sendTransferableBalance(from: string, to: string, tick: string, amount: number) {
  if (from === to) {
    return collection.updateOne(
      {
        address: from,
        tick,
      },
      {
        $inc: {
          available: amount,
          transferable: -amount,
        },
      },
    );
  }
  await collection.updateOne(
    {
      address: from,
      tick,
    },
    {
      $inc: {
        total: -amount,
        transferable: -amount,
      },
    },
  );
  await collection.updateOne(
    {
      address: to,
      tick,
    },
    {
      $setOnInsert: {
        address: to,
        tick,
        slug: tick.toLowerCase(),
        transferable: 0,
      },
      $inc: {
        total: amount,
        available: amount,
      },
    },
    {
      upsert: true,
    },
  );
}

import { Filter, FindOptions, ObjectId, WithId } from "mongodb";

import { RawTransaction } from "../../Services/Bitcoin";
import { getAddressFromVout } from "../../Workers/Bitcoin/Crawlers/Crawl";
import { collection, TransactionDocument } from "./Collection";

/**
 * Add a new transaction to the database.
 *
 * @param tx - Transaction to add.
 */
export async function addTransaction(tx: TransactionDocument) {
  return collection.insertOne(tx);
}

export async function getTransactionsByIds(txids: string[]): Promise<WithId<TransactionDocument>[]> {
  return collection.find({ txid: { $in: txids } }).toArray();
}

/**
 * Get transactions by address..
 *
 * @param address - Address to get transactions for.
 * @param filter  - Additional filter to apply to the query.
 * @param options - Additional options to apply to the query.
 */
export async function getTransactionsByAddress(
  address: string,
  filter: Filter<TransactionDocument> = {},
  options: FindOptions<TransactionDocument> = {}
): Promise<WithId<TransactionDocument>[]> {
  return collection.find({ addresses: address, ...filter }, options).toArray();
}

/**
 * Update the vout for the given transaction.
 *
 * @param _id  - MongoDB collection id to update.
 * @param vout - Vout to update.
 */
export async function updateVoutById(_id: ObjectId, vout: TransactionDocument["vout"]): Promise<void> {
  collection.updateOne({ _id }, { $set: { vout } });
}

/**
 * Get list of unique addresses from the given transaction.
 *
 * @param tx - Transaction to get addresses from.
 */
export async function getAddressesFromTx(tx: RawTransaction): Promise<string[]> {
  const addresses = new Set<string>();
  for (const vout of tx.vout) {
    const address = await getAddressFromVout(vout);
    if (address !== undefined) {
      addresses.add(address);
    }
  }
  return Array.from(addresses);
}

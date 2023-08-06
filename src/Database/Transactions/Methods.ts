import { Filter, FindOptions, ObjectId, WithId } from "mongodb";

import { collection, TransactionDocument } from "./Collection";

export const transactions = {
  collection,

  // ### Core Methods

  insertOne,

  // ### Helper Methods

  getByIds,
  getByAddress,
  updateVoutById,
};

/*
 |--------------------------------------------------------------------------------
 | Core Methods
 |--------------------------------------------------------------------------------
 |
 | Flexible core mongodb methods for the collection. These methods provides a 
 | unified passthrough to the collection directly for querying.
 |
 */

/**
 * Add a new transaction to the database.
 *
 * @param tx - Transaction to add.
 */
async function insertOne(tx: TransactionDocument) {
  return collection.insertOne(tx);
}

/*
 |--------------------------------------------------------------------------------
 | Helper Methods
 |--------------------------------------------------------------------------------
 |
 | List of helper methods for querying more complex data from the collection. 
 | These methods provides a wrapper around core functionality and produces results 
 | under deterministic filters.
 |
 */

async function getByIds(txids: string[]): Promise<WithId<TransactionDocument>[]> {
  return collection.find({ txid: { $in: txids } }).toArray();
}

/**
 * Get transactions by address..
 *
 * @param address - Address to get transactions for.
 * @param filter  - Additional filter to apply to the query.
 * @param options - Additional options to apply to the query.
 */
async function getByAddress(
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
async function updateVoutById(_id: ObjectId, vout: TransactionDocument["vout"]): Promise<void> {
  collection.updateOne({ _id }, { $set: { vout } });
}

import { DeleteOptions, Filter, FindOptions } from "mongodb";

import { collection, SadoOffer, SadoOrder } from "./Collection";

export const orders = {
  collection,

  // ### Core Methods

  insertOne,
  find,
  findOne,
  count,
  deleteMany,

  // ### Helper Methods

  addOffer,
  getByAddress,
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

async function insertOne(order: SadoOrder) {
  await collection.updateOne({ cid: order.cid }, { $set: order }, { upsert: true });
}

async function find(filter: Filter<SadoOrder>, options?: FindOptions<SadoOrder>) {
  return collection.find(filter, options).toArray();
}

async function findOne(filter: Filter<SadoOrder>, options?: FindOptions<SadoOrder>): Promise<SadoOrder | undefined> {
  const order = await collection.findOne(filter, options);
  if (order === null) {
    return undefined;
  }
  return order;
}

async function count(filter: Filter<SadoOrder>) {
  return collection.countDocuments(filter);
}

async function deleteMany(filter: Filter<SadoOrder>, options?: DeleteOptions) {
  await collection.deleteMany(filter, options);
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

async function addOffer(cid: string, offer: SadoOffer) {
  await collection.updateOne({ cid }, { $push: { offers: offer } });
}

async function getByAddress(address: string, options?: FindOptions<SadoOrder>): Promise<SadoOrder[]> {
  return find({ $or: [{ "orderbooks.address": address }, { maker: address }] }, options);
}

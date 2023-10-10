import { DeleteOptions, Filter, FindOptions } from "mongodb";

import { config } from "../../../Config";
import { redis } from "../../../Services/Redis";
import { collection, SadoDocument } from "./Collection";

const SADO_BLOCK_KEY = "sado_b";

export const events = {
  collection,

  // ### Core Methods

  insertOne,
  find,
  findOne,
  count,
  deleteMany,

  // ### Indexer Methods

  getHeighestBlock,
  setBlockNumber,
  getBlockNumber,
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

async function insertOne(sado: SadoDocument) {
  await collection.updateOne({ cid: sado.cid }, { $set: sado }, { upsert: true });
}

async function find(filter: Filter<SadoDocument>, options?: FindOptions<SadoDocument>) {
  return collection.find(filter, options).toArray();
}

export async function findOne(filter: Filter<SadoDocument>, options?: FindOptions<SadoDocument>) {
  const document = await collection.findOne(filter, options);
  if (document === null) {
    return undefined;
  }
  return document;
}

export async function count(filter: Filter<SadoDocument>) {
  return collection.countDocuments(filter);
}

async function deleteMany(filter: Filter<SadoDocument>, options?: DeleteOptions) {
  await collection.deleteMany(filter, options);
}

/*
 |--------------------------------------------------------------------------------
 | Indexer Methods
 |--------------------------------------------------------------------------------
 |
 | Methods used by indexing operations to update collection states.
 |
 */

async function getHeighestBlock(): Promise<number> {
  const order = await collection.findOne({}, { sort: { height: -1 } });
  if (order === null) {
    return config.sado.startBlock;
  }
  return order.height;
}

async function setBlockNumber(n: number) {
  return redis.set(SADO_BLOCK_KEY, n);
}

async function getBlockNumber() {
  const n = await redis.get(SADO_BLOCK_KEY);
  if (n === null) {
    return 0;
  }
  return parseInt(n, 10);
}

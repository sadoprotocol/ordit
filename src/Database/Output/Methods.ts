import {
  AggregateOptions,
  AggregationCursor,
  AnyBulkWriteOperation,
  DeleteOptions,
  Document,
  Filter,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";

import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, OutputDocument, SpentOutput } from "./Collection";

export const outputs = {
  collection,

  // ### Core Methods

  insertMany,
  find,
  findOne,
  updateOne,
  cursor,
  aggregate,
  count,
  deleteMany,

  // ### Helper Methods

  getByAddress,
  getUnspentByAddress,
  getVinLocation,
  getHeighestBlock,
  getCountByAddress,

  // ### Indexer Methods

  addSpents,
  addValues,
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

async function insertMany(outputs: OutputDocument[], chunkSize = 1000) {
  const promises = [];
  for (let i = 0; i < outputs.length; i += chunkSize) {
    const chunk = outputs.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function find(filter: Filter<OutputDocument>, options?: FindOptions<OutputDocument>) {
  return collection.find(filter, options).toArray();
}

async function findOne(
  filter: Filter<OutputDocument>,
  options?: FindOptions<OutputDocument>
): Promise<OutputDocument | undefined> {
  const output = await collection.findOne(filter, options);
  if (output === null) {
    return undefined;
  }
  return output;
}

async function updateOne(
  filter: Filter<OutputDocument>,
  update: UpdateFilter<OutputDocument> | Partial<OutputDocument>,
  options?: UpdateOptions
) {
  return collection.updateOne(filter, update, options);
}

function cursor(filter: Filter<OutputDocument>, options?: FindOptions<OutputDocument>) {
  return collection.find(filter, options);
}

function aggregate(pipeline?: Document[], options?: AggregateOptions): AggregationCursor<OutputDocument> {
  return collection.aggregate(pipeline, options);
}

async function count(filter: Filter<OutputDocument>) {
  return collection.countDocuments(filter);
}

async function deleteMany(filter: Filter<OutputDocument>, options?: DeleteOptions) {
  return collection.deleteMany(filter, options);
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

async function getVinLocation(outpoint: string): Promise<string | undefined> {
  const [txid, n] = outpoint.split(":");
  const output = await collection.findOne({ "vout.txid": txid, "vout.n": parseInt(n, 10) });
  if (output?.vin === undefined || output?.vin === null) {
    return undefined;
  }
  return `${output.vin.txid}:${output.vin.n}`;
}

async function getHeighestBlock(): Promise<number> {
  const output = await collection.findOne({}, { sort: { "vout.block.height": -1 } });
  if (output === null) {
    return 0;
  }
  return output.vout.block.height;
}

async function getByAddress(
  address: string,
  filter?: Filter<OutputDocument>,
  options?: FindOptions<OutputDocument>
): Promise<OutputDocument[]> {
  return collection.find({ addresses: address, ...filter }, options).toArray();
}

async function getUnspentByAddress(address: string, options?: FindOptions<OutputDocument>): Promise<OutputDocument[]> {
  return collection.find({ addresses: address, vin: { $exists: false } }, options).toArray();
}

async function getCountByAddress(address: string): Promise<{
  sent: number;
  received: number;
  total: number;
}> {
  return collection
    .aggregate([
      {
        $match: {
          addresses: address,
        },
      },
      {
        $group: {
          _id: null,
          totalVout: {
            $sum: {
              $cond: [{ $ifNull: ["$vout", false] }, 1, 0],
            },
          },
          totalVin: {
            $sum: {
              $cond: [{ $ifNull: ["$vin", false] }, 1, 0],
            },
          },
        },
      },
    ])
    .toArray()
    .then((result) => {
      if (result.length === 0) {
        return { sent: 0, received: 0, total: 0 };
      }
      const [{ totalVout, totalVin }] = result;
      return {
        sent: totalVout,
        received: totalVin,
        total: totalVout + totalVin,
      };
    });
}

/*
 |--------------------------------------------------------------------------------
 | Indexer Methods
 |--------------------------------------------------------------------------------
 |
 | Methods used by indexing operations to update collection states.
 |
 */

async function addSpents(spents: SpentOutput[], chunkSize = 1000) {
  if (spents.length === 0) {
    return;
  }
  const bulkops: AnyBulkWriteOperation<OutputDocument>[] = [];
  for (const { vout, vin } of spents) {
    bulkops.push({
      updateOne: {
        filter: { "vout.txid": vout.txid, "vout.n": vout.n },
        update: {
          $set: {
            vin: vin,
          },
        },
      },
    });
    if (bulkops.length === chunkSize) {
      await collection.bulkWrite(bulkops);
      bulkops.length = 0;
    }
  }
  if (bulkops.length > 0) {
    await collection.bulkWrite(bulkops);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Indexer Patch Methods
 |--------------------------------------------------------------------------------
 |
 | List of temporary methods aimed at patching the database. These are
 | used when we have to re-run indexers to update outputs with new blockchain
 | values.
 |
 | These methods should be removed once the database is up-to-date.
 |
 */

async function addValues(values: { txid: string; n: number; value: number }[], chunkSize = 1000) {
  if (values.length === 0) {
    return;
  }
  const bulkops: AnyBulkWriteOperation<OutputDocument>[] = [];
  for (const { txid, n, value } of values) {
    bulkops.push({
      updateOne: {
        filter: { "vout.txid": txid, "vout.n": n },
        update: {
          $set: {
            value: value,
          },
        },
      },
    });
    if (bulkops.length === chunkSize) {
      await collection.bulkWrite(bulkops);
      bulkops.length = 0;
    }
  }
  if (bulkops.length > 0) {
    await collection.bulkWrite(bulkops);
  }
}

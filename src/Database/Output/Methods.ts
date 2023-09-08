import {
  AggregateOptions,
  AggregationCursor,
  DeleteOptions,
  Document,
  Filter,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";

import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { log } from "../../Workers/Log";
import { collection, OutputDocument, SpentOutput } from "./Collection";
import { noSpentsFilter } from "./Utilities";

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
  getByLocation,
  getUnspentByAddress,
  getVinLocation,
  getHeighestBlock,
  getCountByAddress,

  // ### Indexer Methods

  addSpents,
  addRelayed,
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

async function insertMany(outputs: OutputDocument[], chunkSize = 500) {
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

async function getByLocation(txid: string, n: number) {
  const output = await collection.findOne({ "vout.txid": txid, "vout.n": n });
  if (output === null) {
    return undefined;
  }
  return output;
}

async function getUnspentByAddress(address: string, options?: FindOptions<OutputDocument>): Promise<OutputDocument[]> {
  return collection.find({ addresses: address, ...noSpentsFilter }, options).toArray();
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

async function addSpents(spents: SpentOutput[], chunkSize = 500) {
  if (spents.length === 0) {
    return;
  }

  const bulkops: any[][] = new Array(Math.ceil(spents.length / chunkSize)).fill(0).map(() => []);

  let i = 0;
  for (const { vout, vin } of spents) {
    bulkops[i].push({
      updateOne: {
        filter: { "vout.txid": vout.txid, "vout.n": vout.n },
        update: {
          $set: { vin },
        },
      },
    });
    if (bulkops[i].length % chunkSize === 0) {
      i += 1;
    }
  }

  await Promise.all(bulkops.map((ops) => collection.bulkWrite(ops)));
}

async function addRelayed(txid: string, n: number) {
  await collection.updateOne({ "vout.txid": txid, "vout.n": n }, { $set: { spent: true } });
}

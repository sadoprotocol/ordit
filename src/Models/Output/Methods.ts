import { AnyBulkWriteOperation, Filter, FindOptions } from "mongodb";

import { logger } from "../../Logger";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, OutputDocument, SpentOutput } from "./Collection";

export async function addOutputs(outputs: OutputDocument[], chunkSize = 1000) {
  const ts = performance.now();

  const promises = [];
  for (let i = 0; i < outputs.length; i += chunkSize) {
    const chunk = outputs.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);

  logger.addDatabase("outputs", performance.now() - ts);
}

export async function setSpentOutputs(spents: SpentOutput[], chunkSize = 1000) {
  if (spents.length === 0) {
    return;
  }
  const ts = performance.now();

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

  logger.addDatabase("spents", performance.now() - ts);
}

export async function getOutputsByAddress(
  address: string,
  filter?: Filter<OutputDocument>,
  options?: FindOptions<OutputDocument>
): Promise<OutputDocument[]> {
  return collection.find({ addresses: address, ...filter }, options).toArray();
}

export async function getUnspentOutputsByAddress(address: string): Promise<OutputDocument[]> {
  return collection.find({ addresses: address, vin: { $exists: false } }).toArray();
}

export async function getTransactionCountByAddress(address: string): Promise<{
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

export async function getSpendingVin(outpoint: string): Promise<string | undefined> {
  const [txid, n] = outpoint.split(":");
  const output = await collection.findOne({ "vout.txid": txid, "vout.n": parseInt(n, 10) });
  if (output?.vin === undefined) {
    return undefined;
  }
  return `${output.vin.txid}:${output.vin.n}`;
}

export async function getHeighestBlock(): Promise<number> {
  const output = await collection.findOne({}, { sort: { "vout.block.height": -1, "vin.block.height": -1 } });
  if (output === null) {
    return 0;
  }
  return getHeighestOutput(output).block.height;
}

export function getHeighestOutput(output: OutputDocument): OutputDocument["vout"] {
  if (output.vin !== undefined && output.vin.block.height > output.vout.block.height) {
    return output.vin;
  }
  return output.vout;
}

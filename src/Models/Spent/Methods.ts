import { AnyBulkWriteOperation } from "mongodb";

import { logger } from "../../Logger";
import { collection, SpentDocument } from "./Collection";

/**
 * Insert list of spent vouts into the database.
 *
 * @param spents - List of spent vouts to update.
 */
export async function addSpents(spents: SpentDocument[]): Promise<void> {
  const ts = performance.now();
  const bulkops: AnyBulkWriteOperation<SpentDocument>[] = [];
  for (const spent of spents) {
    bulkops.push({
      updateOne: {
        filter: { vout: spent.vout },
        update: { $set: spent },
        upsert: true,
      },
    });
    if (bulkops.length === 1000) {
      await collection.bulkWrite(bulkops);
      bulkops.length = 0;
    }
  }
  if (bulkops.length > 0) {
    await collection.bulkWrite(bulkops);
  }
  logger.addDatabase("spents", performance.now() - ts);
}

/**
 * Get the heighest recorded block number from the spents list.
 */
export async function getHeighestBlock(): Promise<number> {
  const spent = await collection.findOne({}, { sort: { block: -1 } });
  if (spent === null) {
    return 0;
  }
  return spent.block;
}

/**
 * Get the spending vin location for the given outpoint.
 *
 * @param outpoint - Vout to get spending vin for.
 */
export async function getSpendingVin(outpoint: string): Promise<string | undefined> {
  const document = await collection.findOne({ vout: outpoint });
  if (document === null) {
    return undefined;
  }
  return document.vin;
}

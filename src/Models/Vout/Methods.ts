import { AnyBulkWriteOperation, WithId } from "mongodb";

import { logger } from "../../Logger";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, SpentVout, VoutDocument } from "./Collection";

/**
 * Add a list of vouts to the database.
 *
 * Sanitize the vout and resolve the address to the `addressTo` value on the
 * record before inserting the documents.
 *
 * @param vouts - List of vouts to add.
 */
export async function addVouts(vouts: VoutDocument[], chunkSize = 500): Promise<void> {
  const ts = performance.now();

  const promises = [];
  for (let i = 0; i < vouts.length; i += chunkSize) {
    const chunk = vouts.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);

  logger.addDatabase("vouts", performance.now() - ts);
}

/**
 * Get all vouts for the given address.
 *
 * @param address - Address to get vouts for.
 */
export async function getVoutsByAddress(address: string): Promise<WithId<VoutDocument>[]> {
  return collection.find({ address }).toArray();
}

/**
 * Get the heighest recorded block number from the spents list.
 */
export async function getHeighestBlock(): Promise<number> {
  const vout = await collection.findOne({}, { sort: { blockN: -1 } });
  if (vout === null) {
    return 0;
  }
  return vout.blockN;
}

/**
 * Get the spending vin location for the given outpoint.
 *
 * @param outpoint - Vout to get spending vin for.
 */
export async function getSpendingVin(outpoint: string): Promise<string | undefined> {
  const [txid, n] = outpoint.split(":");
  const document = await collection.findOne({ txid, n: parseInt(n, 10) });
  if (document === null || document.nextTxid === undefined) {
    return undefined;
  }
  return `${document.nextTxid}:${document.vin}`;
}

/**
 * Get list of unspent utxos for the given address.
 *
 * @param address - Address to get unspent vouts for.
 */
export async function getUnspentVouts(address: string): Promise<VoutDocument[]> {
  return collection.find({ address, nextTxid: { $exists: false } }).toArray();
}

/**
 * Take a list of spent vouts and update the database using bulk write operations.
 *
 * Another side effect of this function is updating the corresponding VIN setting
 * the `addressFrom` field to the address of the vout being spent if it exists.
 *
 * @param spents - List of spent vouts to update.
 */
export async function setSpentVouts(spents: SpentVout[]): Promise<void> {
  if (spents.length === 0) {
    return;
  }
  const ts = performance.now();

  const bulkops: AnyBulkWriteOperation<VoutDocument>[] = [];
  for (const { vout, vin } of spents) {
    bulkops.push({
      updateOne: {
        filter: { txid: vout.txid, n: vout.n },
        update: {
          $set: {
            nextTxid: vin.txid,
            vin: vin.n,
          },
        },
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
 * Delete any vouts that are in blocks after the given height.
 *
 * This is used to handle rollbacks and avoid duplicate conflicts on re-indexing
 * previous blocks on stale chains.
 *
 * @param height - Height of the block to clear vouts after.
 */
export async function clearVoutsAfterBlock(height: number): Promise<void> {
  await collection.deleteMany({ blockN: { $gt: height - 1 } });
}

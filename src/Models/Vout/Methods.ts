import { AnyBulkWriteOperation } from "mongodb";

import { logger } from "../../Logger";
import { Block, optional, RawTransaction, rpc, Vout } from "../../Services/Bitcoin";
import { sanitizeScriptPubKey, sats } from "../../Utilities/Bitcoin";
import { collection, SpentVout, VoutDocument } from "./Collection";

/**
 * Add a list of vouts to the database.
 *
 * Sanitize the vout and resolve the address to the `addressTo` value on the
 * record before inserting the documents.
 *
 * @param block - Block the vouts belong to.
 * @param tx    - Transaction the vouts belong to.
 * @param vouts - List of vouts to add.
 */
export async function addVouts(block: Block, tx: RawTransaction, vouts: Vout[]): Promise<void> {
  const documents: VoutDocument[] = [];
  for (const vout of vouts) {
    sanitizeScriptPubKey(vout.scriptPubKey);
    documents.push({
      addressTo: await getAddressFromVout(vout),
      blockHash: block.hash,
      blockN: block.height,
      txid: tx.txid,
      ...vout,
      sats: sats(vout.value),
    });
  }
  const ts = performance.now();
  await collection.insertMany(documents);
  logger.addDatabase(performance.now() - ts);
}

/**
 * Take a list of spent vouts and update the database using bulk write operations.
 *
 * Another side effect of this function is updating the corresponding VIN setting
 * the `addressFrom` field to the address of the vout being spent if it exists.
 *
 * @param spents - List of spent vouts to update.
 */
export async function setVoutsSpent(spents: SpentVout[]): Promise<void> {
  const bulkops: AnyBulkWriteOperation<VoutDocument>[] = [];
  if (spents.length === 0) {
    return;
  }
  const ts = performance.now();
  for (const { txid, vout, location } of spents) {
    bulkops.push({
      updateOne: {
        filter: { txid, n: vout },
        update: { $set: { spent: location } },
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
  logger.addDatabase(performance.now() - ts);
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

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getAddressFromVout(vout: Vout): Promise<string | undefined> {
  if (vout.scriptPubKey.address !== undefined) {
    return vout.scriptPubKey.address;
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses[0];
  }
  if (vout.scriptPubKey.desc === undefined) {
    return undefined;
  }
  const derived = await rpc.util
    .deriveAddresses(vout.scriptPubKey.desc)
    .catch(optional<string[]>(rpc.util.code.NO_CORRESPONDING_ADDRESS, []));
  return derived[0];
}

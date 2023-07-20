import { logger } from "../../Logger";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, VoutDocument } from "./Collection";

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

import { logger } from "../../Logger";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, VinDocument } from "./Collection";

/**
 * Add a list of vins to the database.
 *
 * A side effect of this function is updating the corresponding VOUT setting the
 * `spent` field to the location of the vin being added.
 *
 * @param vins - List of vins to add.
 */
export async function addVins(vins: VinDocument[], chunkSize = 500): Promise<void> {
  const ts = performance.now();

  const promises = [];
  for (let i = 0; i < vins.length; i += chunkSize) {
    const chunk = vins.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);

  logger.addDatabase("vins", performance.now() - ts);
}

/**
 * Delete any vins that are in blocks after the given height.
 *
 * This is used to handle rollbacks and avoid duplicate conflicts on re-indexing
 * previous blocks on stale chains.
 *
 * @param height - Height of the block to clear vins after.
 */
export async function clearVinsAfterBlock(height: number): Promise<void> {
  await collection.deleteMany({ blockN: { $gt: height - 1 } });
}

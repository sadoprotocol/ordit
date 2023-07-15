import { logger } from "../../Logger";
import { Block, isCoinbase, RawTransaction, TxVin, Vin } from "../../Services/Bitcoin";
import { setVoutsSpent, SpentVout } from "../Vout";
import { collection } from "./Collection";

/**
 * Add a list of vins to the database.
 *
 * A side effect of this function is updating the corresponding VOUT setting the
 * `spent` field to the location of the vin being added.
 *
 * @param block - Block the vins belong to.
 * @param tx    - Transaction the vins belong to.
 * @param vins - List of vins to add.
 */
export async function addVins(block: Block, tx: RawTransaction, vins: Vin[]): Promise<void> {
  const txVins: TxVin[] = [];
  for (const vin of vins) {
    if (isCoinbase(vin)) {
      continue;
    }
    txVins.push(vin);
  }

  if (txVins.length === 0) {
    return;
  }

  const spents: SpentVout[] = [];

  const ts = performance.now();
  await collection.insertMany(
    txVins.map((vin, n) => {
      spents.push({ txid: vin.txid, vout: vin.vout, location: { txid: tx.txid, n } });
      return {
        blockHash: block.hash,
        blockN: block.height,
        ...vin,
        txid: tx.txid,
        n,
        spending: {
          txid: vin.txid,
          n: vin.vout,
        },
      };
    })
  );
  logger.addDatabase(performance.now() - ts);

  await setVoutsSpent(spents);
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

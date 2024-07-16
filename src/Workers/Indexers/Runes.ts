import { isRunestone, RunestoneSpec, tryDecodeRunestone } from "runestone-lib";
import { RunestoneTx } from "runestone-lib/src/runestone";

import { db } from "~Database";
import { Indexer, IndexHandler, VoutData } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { ord } from "~Services/Ord";

export const runesIndexer: IndexHandler = {
  name: "runes",

  async run(indexer: Indexer, { log, height }) {
    if (height < RUNES_BLOCK) {
      return log(`🚫 Runes indexer has not passed runes block`);
    }

    let ts = perf();
    log(`⏳ Waiting for block ${height.toLocaleString()}`);
    await ord.waitForBlock(height);
    log(`  ⌛ Resolved [${ts.now} seconds]`);

    ts = perf();
    const runes = await getRunestones(indexer.txs);
    log(`🚚 Delivering ${runes.length.toLocaleString()} runestones [${ts.now} seconds]`);

    ts = perf();
    await insertRunes(runes);
    log(`💾 Saved ${runes.length.toLocaleString()} runestones [${ts.now} seconds]`);
  },

  async reorg(height: number) {
    await db.inscriptions.deleteMany({ height: { $gte: height } });
  },
};

async function getRunestones(txs: RunestoneTx[]): Promise<RunestoneSpec[]> {
  const runestones: RunestoneSpec[] = [];
  for (const tx of txs) {
    const decodedRunestone = tryDecodeRunestone(tx);
    if (decodedRunestone === null) continue;
    if (isRunestone(decodedRunestone)) runestones.push(decodedRunestone);
  }
  return runestones;
}

export async function insertRunes(runestones: RunestoneSpec[]) {
  await db.runestones.insertMany(runestones);
}

import { isRunestone, RunestoneSpec, tryDecodeRunestone } from "runestone-lib";
import { db } from "~Database";
import { Indexer, IndexHandler, VoutData } from "~Libraries/Indexer/Indexer";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { perf } from "~Libraries/Log";
import { ord } from "~Services/Ord";
import { parseLocation } from "~Utilities/Transaction";

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
    const runes = await getRunestones(indexer.vouts);
    log(`🚚 Delivering ${runes.length.toLocaleString()} runestones [${ts.now} seconds]`);

    ts = perf();
    await insertRunes(runes);
    log(`💾 Saved ${runes.length.toLocaleString()} runestones [${ts.now} seconds]`);
  },

  async reorg(height: number) {
    await db.inscriptions.deleteMany({ height: { $gte: height } });
  },
};

async function getRunestones(vouts: VoutData[]): Promise<RunestoneSpec[]> {
  const runestones: RunestoneSpec[] = [];
  for (const vout of vouts) {
    const decodedRunestones = tryDecodeRunestone({ vout: [{ scriptPubKey: { hex: vout.scriptPubKey.hex } }] });
    if (decodedRunestones === null) continue;
    if (isRunestone(decodedRunestones)) runestones.push(decodedRunestones);
  }
  return runestones;
}

export async function insertRunes(runestones: RunestoneSpec[]) {
  await db.runestones.insertMany(runestones);
}

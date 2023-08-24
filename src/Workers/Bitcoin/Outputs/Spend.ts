import { db } from "../../../Database";
import { SPENTS_DATA } from "../../../Paths";
import { readDir, readFile, removeFile } from "../../../Utilities/Files";
import { log, perf } from "../../Log";

export async function spend() {
  const blocks = await readDir(SPENTS_DATA);
  if (blocks.length === 0) {
    return log("\n   💤 All spents has been processed");
  }
  log(`\n   🚚 Processing ${blocks.length} blocks`);
  for (const block of blocks) {
    await parseBlock(block);
  }
}

async function parseBlock(block: string) {
  log(`\n   🪙 block ${block} processing spents`);
  const ts = perf();
  const data = await readFile(`${SPENTS_DATA}/${block}`);
  if (data === undefined) {
    return;
  }
  log(`\n     💽 block data loaded [${ts.now} seconds]`);
  const spents = JSON.parse(data);
  return db.outputs.addSpents(spents).then(() => {
    log(`\n     💾 saved ${spents.length} spents [${ts.now} seconds]`);
    return removeFile(`${SPENTS_DATA}/${block}`);
  });
}

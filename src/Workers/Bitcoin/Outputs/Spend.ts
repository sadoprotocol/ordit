import debug from "debug";

import { db } from "../../../Database";
import { SPENTS_DATA } from "../../../Paths";
import { readDir, readFile, removeFile } from "../../../Utilities/Files";

const log = debug("bitcoin-spend");

export async function spend() {
  const blocks = await readDir(SPENTS_DATA);
  if (blocks.length === 0) {
    return log("all spents processed");
  }
  log("processing %d blocks", blocks.length);
  for (const block of blocks) {
    await parseBlock(block);
  }
}

async function parseBlock(block: string) {
  const data = await readFile(`${SPENTS_DATA}/${block}`);
  if (data === undefined) {
    return;
  }
  const spents = JSON.parse(data);
  return db.outputs.addSpents(spents).then(() => {
    log("block %d processed %d spents", block, spents.length);
    return removeFile(`${SPENTS_DATA}/${block}`);
  });
}

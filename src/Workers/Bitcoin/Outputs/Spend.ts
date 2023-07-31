import debug from "debug";

import { limiter } from "../../../Libraries/Limiter";
import { setSpentOutputs } from "../../../Models/Output";
import { PARSER_DATA, PARSER_ERROR } from "../../../Paths";
import { readDir, readFile, removeFile, writeFile } from "../../../Utilities/Files";

const log = debug("bitcoin-spend");

const queue = limiter(20);

export async function spend() {
  const blocks = await readDir(PARSER_DATA);
  if (blocks.length === 0) {
    return log("all spents processed");
  }
  log("processing %d blocks", blocks.length);
  for (const block of blocks) {
    queue.push(async () => {
      const data = await readFile(`${PARSER_DATA}/${block}`);
      if (data === undefined) {
        writeFile(`${PARSER_ERROR}/${block}`, `Could not read block file ${block}`);
        return;
      }
      const spents = JSON.parse(data);
      return setSpentOutputs(spents).then(() => {
        removeFile(`${PARSER_DATA}/${block}`);
        log("block %d processed %d spents", block, spents.length);
      });
    });
  }
  await queue.run();
}

import debug from "debug";

import { bootstrap } from "../../../Bootstrap";
import { config } from "../../../Config";
import { db } from "../../../Database";
import { limiter } from "../../../Libraries/Limiter";
import { BLOCKS_DIR } from "../../../Paths";
import { readDir, readFile } from "../../../Utilities/Files";

const log = debug("bitcoin-values");

const queue = limiter(10);

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await parseValues();
  log("done");
}

async function parseValues() {
  const blocks = await readDir(BLOCKS_DIR);

  if (blocks.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return parseValues();
  }

  log("processing %d blocks", blocks.length);
  for (const block of blocks) {
    queue.push(async () => {
      const data = await readFile(`${BLOCKS_DIR}/${block}`);
      if (!data) {
        return;
      }
      try {
        const values = JSON.parse(data);
        return db.outputs.addValues(values).then(() => {
          log("block %d valued %d outputs", block, values.length);
        });
      } catch (error) {
        console.log(block, data);
        throw error;
      }
    });
  }
  await queue.run();
}

async function getBlockHeight() {
  const output = await db.outputs.findOne({ value: null }, { sort: { "vout.block.height": 1 } });
  if (output === undefined) {
    return 0;
  }
  return output.vout.block.height;
}

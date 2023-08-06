import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import debug from "debug";

import { bootstrap } from "../../../Bootstrap";
import { config } from "../../../Config";
import { db } from "../../../Database";
import { limiter } from "../../../Libraries/Limiter";
import { DATA_DIR } from "../../../Paths";
import { readDir, readFile, removeFile } from "../../../Utilities/Files";

const log = debug("bitcoin-values");

const queue = limiter(10);

const VALUES_DIR = resolve(DATA_DIR, "values");
mkdirSync(VALUES_DIR, { recursive: true });

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await setValues();
  log("done");
}

async function setValues() {
  const blocks = await readDir(VALUES_DIR);
  log("processing %d blocks", blocks.length);
  for (const block of blocks) {
    queue.push(async () => processValues(block));
  }
  await queue.run();
}

async function processValues(block: string) {
  const data = await readFile(`${VALUES_DIR}/${block}`);
  if (!data) {
    return;
  }
  try {
    const values = JSON.parse(data);
    return db.outputs.addValues(values).then(() => {
      log("block %d valued %d outputs", block, values.length);
      return removeFile(`${VALUES_DIR}/${block}`);
    });
  } catch (error) {
    console.log(block, data);
    throw error;
  }
}

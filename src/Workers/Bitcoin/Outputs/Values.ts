import debug from "debug";

import { bootstrap } from "../../../Bootstrap";
import { config } from "../../../Config";
import { limiter } from "../../../Libraries/Limiter";
import { collection, setOutputValues } from "../../../Models/Output";
import { PARSER_VALUES } from "../../../Paths";
import { rpc } from "../../../Services/Bitcoin";
import { readDir, readFile, removeFile, writeFile } from "../../../Utilities/Files";

const log = debug("bitcoin-values");

const queue = limiter(20);

main()
  .catch(console.log)
  .finally(() => process.exit(0));

let done = false;

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await Promise.all([mineBlocks(), parseValues()]);
  log("done");
}

async function mineBlocks() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  const outputHeight = await getBlockHeight();

  log("indexing from %d to %d", outputHeight, blockHeight);

  // ### Crawl Chain

  let height = outputHeight;
  while (height <= blockHeight) {
    const values: any[] = [];
    const block = await rpc.blockchain.getBlock(height, 2);
    for (const tx of block.tx) {
      for (const vout of tx.vout) {
        values.push({
          txid: tx.txid,
          n: vout.n,
          value: vout.value,
        });
      }
    }
    await writeFile(`${PARSER_VALUES}/${height}`, JSON.stringify(values));
    height += 1;
  }

  done = true;
}

async function parseValues() {
  while (done === false) {
    const blocks = await readDir(PARSER_VALUES);
    if (blocks.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return parseValues();
    }
    log("processing %d blocks", blocks.length);
    for (const block of blocks) {
      queue.push(async () => {
        const data = await readFile(`${PARSER_VALUES}/${block}`);
        if (!data) {
          return;
        }
        try {
          const values = JSON.parse(data);
          return setOutputValues(values).then(() => {
            removeFile(`${PARSER_VALUES}/${block}`);
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
}

async function getBlockHeight() {
  const output = await collection.findOne({ value: null }, { sort: { "vout.block.height": 1 } });
  if (output === null) {
    return 0;
  }
  return output.vout.block.height;
}

import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { BLOCKS_DIR } from "../../Paths";
import { rpc } from "../../Services/Bitcoin";
import { readDir, writeFile } from "../../Utilities/Files";

const log = debug("bitcoin-values");

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await parseBlocks();
  log("done");
}

async function parseBlocks() {
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
    await writeFile(`${BLOCKS_DIR}/${height}`, JSON.stringify(values));
    height += 1;
  }
}

async function getBlockHeight() {
  const files = await readDir(BLOCKS_DIR);
  return files.length;
}

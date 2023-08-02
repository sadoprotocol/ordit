import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { deleteOutputsAfterHeight, getHeighestBlock, getOutput } from "../../Models/Output";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { crawl } from "./Outputs/Output";

const log = debug("bitcoin-indexer");

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

async function main() {
  log("network: %s", config.chain.network);

  await bootstrap();

  // ### Resolved Heights

  const currentBlockHeight = await rpc.blockchain.getBlockCount();
  log("current network block height is %d", currentBlockHeight);

  const lastCrawledBlockHeight = await getHeighestBlock();
  let crawlerBlockHeight = lastCrawledBlockHeight === 0 ? 0 : lastCrawledBlockHeight;
  log("current indexed block height is %d", crawlerBlockHeight);

  // ### Reorg Checks

  const reorgHeight = await getReorgHeight(crawlerBlockHeight);
  if (reorgHeight !== crawlerBlockHeight) {
    log("Reorg detected, rolling back to block %d from %d", reorgHeight, crawlerBlockHeight);
    await deleteOutputsAfterHeight(reorgHeight);
    crawlerBlockHeight = reorgHeight;
  }

  // ### Crawl Chain

  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawl(crawlerBlockHeight, currentBlockHeight);
    printProgress("bitcoin-crawler", crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
}

async function getReorgHeight(height: number): Promise<number> {
  const blockHash = await rpc.blockchain.getBlockHash(height);
  const output = await getOutput({ "vout.block.height": height });
  if (output === undefined || output.vout.block.hash !== blockHash) {
    return getReorgHeight(height - 1);
  }
  return height;
}

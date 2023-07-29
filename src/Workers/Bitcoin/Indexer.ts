import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { getHeighestBlock } from "../../Models/Output";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { crawl } from "./OutputCrawl";

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

  const currentBlockHeight = await rpc.blockchain.getBlockCount();
  log("current network block height is %d", currentBlockHeight);

  const lastCrawledBlockHeight = await getHeighestBlock();
  let crawlerBlockHeight = lastCrawledBlockHeight === 0 ? 0 : lastCrawledBlockHeight - 1;
  log("current indexed block height is %d", crawlerBlockHeight);

  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawl(crawlerBlockHeight, currentBlockHeight);
    printProgress("bitcoin-crawler", crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
}

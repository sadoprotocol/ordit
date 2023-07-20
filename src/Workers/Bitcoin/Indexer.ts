import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { rpc } from "../../Services/Bitcoin";
import { crawl } from "./Crawl";
import { blockHeight } from "./Data";

const log = debug("btc-indexer");

main()
  .then(() => process.exit(0))
  .catch(console.log);

async function main() {
  log("network: %s", config.chain.network);

  await bootstrap();

  // ### Get Chain State

  const currentBlockHeight = await rpc.blockchain.getBlockCount();
  log("current network block height is %d", currentBlockHeight);

  let crawlerBlockHeight = await blockHeight();
  log("current indexed block height is %d", crawlerBlockHeight);

  // ### Start Crawler

  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawl(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight = await blockHeight(crawlerBlockHeight + 1);
  }
}

import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { rpc } from "../../Services/Bitcoin";
import { crawl } from "./Crawl";
import { blockHeight } from "./Data";

const log = debug("ordit-indexer");

const interval = 60_000 * config.crawler.interval;

start(true);

async function start(prep = false) {
  if (prep === true) {
    log("network: %s", config.chain.network);
    await bootstrap();
  }

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

  // ### Rest
  // Rest for configured interval before crawling again. This is usually closely
  // aligned with the expected block time of the network.

  setTimeout(start, interval);
}

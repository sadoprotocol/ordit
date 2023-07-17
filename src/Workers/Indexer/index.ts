import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { clearVinsAfterBlock } from "../../Models/Vin";
import { clearVoutsAfterBlock } from "../../Models/Vout";
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

  // ### Clear Vins and Vouts
  // Remove any vins and vouts that are associated with blocks that are higher than
  // the current crawler block height. This is to ensure that we don't hit duplicate
  // errors for unique indexes.

  if (prep === true) {
    log("clearing vins and vouts after block %d", crawlerBlockHeight);
    await Promise.all([clearVinsAfterBlock(crawlerBlockHeight), clearVoutsAfterBlock(crawlerBlockHeight)]);
  }

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

import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { BTC_DATA } from "../../Paths";
import { rpc } from "../../Services/Bitcoin";
import { fileExists, removeFile, writeFile } from "../../Utilities/Files";
import { blockHeight } from "./Data";
import { spents } from "./Spents";

const log = debug("bitcoin-indexer");

main()
  .then(() => process.exit(0))
  .catch(console.log);

async function main() {
  const isRunning = await fileExists(`${BTC_DATA}/block_lock`);
  if (isRunning === true) {
    return log("indexer is already running");
  }

  log("network: %s", config.chain.network);

  await writeFile(`${BTC_DATA}/block_lock`, "");
  await bootstrap();

  // ### Get Chain State

  const currentBlockHeight = await rpc.blockchain.getBlockCount();
  log("current network block height is %d", currentBlockHeight);

  let crawlerBlockHeight = await blockHeight();
  log("current indexed block height is %d", crawlerBlockHeight);

  // ### Start Crawler

  while (crawlerBlockHeight <= currentBlockHeight) {
    await spents(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight = await blockHeight(crawlerBlockHeight + 1);
  }

  await removeFile(`${BTC_DATA}/block_lock`);
}

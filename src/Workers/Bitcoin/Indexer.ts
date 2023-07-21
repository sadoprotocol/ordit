import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { getHeighestBlock } from "../../Models/Spent";
import { DATA_DIR } from "../../Paths";
import { rpc } from "../../Services/Bitcoin";
import { fileExists, removeFile, writeFile } from "../../Utilities/Files";
import { spents } from "./Spents";

const log = debug("bitcoin-indexer");

main()
  .then(() => {
    removeFile(`${DATA_DIR}/spent_lock`).then(() => {
      process.exit(0);
    });
  })
  .catch((error) => {
    console.log(error);
    removeFile(`${DATA_DIR}/spent_lock`).then(() => {
      process.exit(0);
    });
  });

async function main() {
  const isRunning = await fileExists(`${DATA_DIR}/spent_lock`);
  if (isRunning === true) {
    return log("indexer is already running");
  }

  log("network: %s", config.chain.network);

  await writeFile(`${DATA_DIR}/spent_lock`, "");
  await bootstrap();

  // ### Get Chain State

  const currentBlockHeight = await rpc.blockchain.getBlockCount();
  log("current network block height is %d", currentBlockHeight);

  let crawlerBlockHeight = (await getHeighestBlock()) - 1;
  log("current indexed block height is %d", crawlerBlockHeight);

  // ### Start Crawler

  while (crawlerBlockHeight <= currentBlockHeight) {
    await spents(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
}

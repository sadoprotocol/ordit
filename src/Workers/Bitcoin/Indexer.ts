import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { getHeighestBlock } from "../../Models/Output";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { crawl } from "./Outputs/Output";

const log = debug("bitcoin-indexer");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);

  await bootstrap();

  // ### Resolved Heights

  const blockHeight = await rpc.blockchain.getBlockCount();
  const outputHeight = await getHeighestBlock();

  log("indexing from %d to %d", outputHeight, blockHeight);

  // ### Crawl Chain

  let height = outputHeight + 1;
  while (height <= blockHeight) {
    await crawl(height, blockHeight);
    printProgress("bitcoin-crawler", height, blockHeight);
    height += 1;
  }
}

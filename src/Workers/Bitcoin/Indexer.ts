import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { crawl } from "./Outputs/Output";

main().finally(() => process.exit(0));

async function main() {
  console.log("network: %s", config.network);

  await bootstrap();

  // ### Resolved Heights

  const blockHeight = await rpc.blockchain.getBlockCount();
  const outputHeight = await db.outputs.getHeighestBlock();

  console.log("indexing from %d to %d", outputHeight, blockHeight);

  // ### Crawl Chain

  let height = outputHeight + 1;
  while (height <= blockHeight) {
    await crawl(height, blockHeight);
    printProgress("bitcoin-crawler", height, blockHeight);
    height += 1;
  }
}

import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { addBlock } from "./AddBlock";
import { getBlockHeight } from "./Status";

const log = debug("sado-indexer");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);

  await bootstrap();

  const blockHeight = await rpc.blockchain.getBlockCount();
  const sadoHeight = await getBlockHeight();

  if (blockHeight === sadoHeight) {
    return log("sado is synced with network");
  }

  log("indexing from %d to %d", sadoHeight, blockHeight);

  let height = sadoHeight + 1;
  while (height <= blockHeight) {
    const hash = await rpc.blockchain.getBlockHash(height);
    const block = await rpc.blockchain.getBlock(hash, 2);

    await addBlock(block);

    printProgress("sado-parser", height, blockHeight);

    height += 1;
  }
}

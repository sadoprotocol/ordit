import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";
import { addBlock } from "./AddBlock";

main().finally(() => process.exit(0));

async function main() {
  console.log("network: %s", config.network);

  await bootstrap();

  const blockHeight = await rpc.blockchain.getBlockCount();
  const sadoHeight = await db.sado.events.getBlockNumber();

  if (blockHeight === sadoHeight) {
    return console.log("sado is synced with network");
  }

  console.log("indexing from %d to %d", sadoHeight, blockHeight);

  let height = sadoHeight + 1;
  while (height <= blockHeight) {
    const hash = await rpc.blockchain.getBlockHash(height);
    const block = await rpc.blockchain.getBlock(hash, 2);

    await addBlock(block);

    printProgress("sado-parser", height, blockHeight);

    height += 1;
  }
}

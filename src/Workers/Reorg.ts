import { getReorgHeight } from "~Libraries/Indexer/Reorg";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";

main().finally(() => process.exit(0));

async function main() {
  console.log("network: %s", config.network);

  await bootstrap();

  console.log("scanning for reorg");

  const reorgHeight = await getReorgHeight();
  if (reorgHeight === -1) {
    console.log("no reorg found after scanning %d blocks", config.reorg.scanLength);
  } else {
    console.log(`found reorg at block ${reorgHeight}`);
  }
}

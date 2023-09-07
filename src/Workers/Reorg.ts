import debug from "debug";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { getReorgHeight } from "./Bitcoin/Reorg";

const log = debug("bitcoin-reorg");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.network);

  await bootstrap();

  log("scanning for reorg");

  const reorgHeight = await getReorgHeight();
  if (reorgHeight === -1) {
    log("no reorg found after scanning %d blocks", config.reorg.scanLength);
  } else {
    log(`found reorg at block ${reorgHeight}`);
  }
}

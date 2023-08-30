import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { spend } from "./Outputs/Spend";

const log = debug("bitcoin-spend");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.network);
  await bootstrap();
  await spend();
}

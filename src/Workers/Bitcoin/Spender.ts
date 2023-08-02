import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { spend } from "./Outputs/Spend";

const log = debug("bitcoin-spend");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await spend();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

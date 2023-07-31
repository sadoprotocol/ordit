import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { spend } from "./Outputs/Spend";

const log = debug("bitcoin-spend");

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await spend();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

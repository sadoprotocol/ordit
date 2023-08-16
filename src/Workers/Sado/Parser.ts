import debug from "debug";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { parse } from "./Parse";

const log = debug("sado-parser");

main().finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await parse();
}

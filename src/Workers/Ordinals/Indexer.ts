import debug from "debug";

import { crawl } from "./Crawl";

const log = debug("ord-indexer");

main()
  .then(() => process.exit(0))
  .catch(console.log);

async function main() {
  log("starting ord indexer");
  await crawl();
  log("done");
}

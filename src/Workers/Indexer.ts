import { bootstrap } from "~Bootstrap";
import { config } from "~Config";
import { log } from "~Libraries/Log";

import { index } from "./Index";

main()
  .catch(console.log)
  .finally(() => {
    process.exit(0);
  });

async function main() {
  log(`network: ${config.network}\n`);
  await bootstrap();
  await index();
}

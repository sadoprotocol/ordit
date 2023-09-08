import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { index } from "./Index";
import { log } from "./Log";

main()
  .catch(console.log)
  .finally(() => {
    process.exit(0);
  });

async function main() {
  log(`network: ${config.network}`);
  await bootstrap();
  await index();
}

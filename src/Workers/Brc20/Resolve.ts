import { bootstrap } from "../../Bootstrap";
import { log } from "../../Libraries/Log";
import { resolve } from "./Parse";

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  await bootstrap();
  log("starting BRC-20 resolver\n");
  await resolve();
  log(`\n🏁 brc-20 parser completed\n`);
}

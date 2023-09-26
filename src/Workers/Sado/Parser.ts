import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { parse } from "./Parse";

main().finally(() => process.exit(0));

async function main() {
  console.log("network: %s", config.network);
  await bootstrap();
  await parse();
}

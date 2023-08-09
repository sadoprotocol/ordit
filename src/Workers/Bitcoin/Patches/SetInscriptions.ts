import debug from "debug";

import { bootstrap } from "../../../Bootstrap";
import { config } from "../../../Config";
import { db } from "../../../Database";
import { DIR_ROOT } from "../../../Paths";
import { readFile } from "../../../Utilities/Files";

const log = debug("bitcoin-ordinals");

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await setInscriptions();
  log("done");
}

async function setInscriptions() {
  const file = await readFile(`${DIR_ROOT}/inscriptions.tsv`);
  if (!file) {
    throw new Error("No inscriptions file generated");
  }

  const inscriptions = [];

  const lines = file.trim().split("\n");
  for (const line of lines) {
    try {
      inscriptions.push(JSON.parse(line));
    } catch (e) {
      console.log(line);
    }
  }

  await db.inscriptions.insertMany(inscriptions);
}

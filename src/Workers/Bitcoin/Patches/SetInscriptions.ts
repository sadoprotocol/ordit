import debug from "debug";

import { bootstrap } from "../../../Bootstrap";
import { config } from "../../../Config";
import { db } from "../../../Database";
import { Inscription } from "../../../Database/Inscriptions";
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

  const inscriptions: Inscription[] = [];

  const lines = file.trim().split("\n");
  for (const line of lines) {
    try {
      const inscription = JSON.parse(line);
      const [media, format] = inscription.media.kind.split(";");
      const [type, subtype] = media.split("/");
      inscriptions.push({
        id: inscription.id,
        owner: inscription.address,
        sat: inscription.sat,
        mimeType: type,
        mimeSubtype: subtype,
        mediaType: media,
        mediaCharset: format?.split("=")[1],
        mediaSize: inscription.media.size,
        mediaContent: inscription.media.content,
        timestamp: inscription.timestamp,
        height: inscription.height,
        fee: inscription.fee,
        genesis: inscription.genesis,
        number: inscription.number,
        outpoint: inscription.output,
      });
    } catch (e) {
      console.log(line);
    }
  }

  await db.inscriptions.insertMany(inscriptions);
}

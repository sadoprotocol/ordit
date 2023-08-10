import { createReadStream } from "node:fs";

import debug from "debug";
import * as readline from "readline";

import { bootstrap } from "../../Bootstrap";
import { config } from "../../Config";
import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { DIR_ROOT } from "../../Paths";

const log = debug("bitcoin-ordinals");

main()
  .catch(console.log)
  .finally(() => process.exit(0));

async function main() {
  log("network: %s", config.chain.network);
  await bootstrap();
  await importInscriptions();
  log("done");
}

async function importInscriptions() {
  const fileStream = createReadStream(`${DIR_ROOT}/inscriptions.tsv`);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const ts = performance.now();

  let inscriptions: Inscription[] = [];
  let resolved = 0;

  for await (const line of rl) {
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
      resolved += 1;
    } catch (e) {
      console.log(line);
    }

    if (inscriptions.length % 1000 === 0) {
      db.inscriptions.collection.insertMany(inscriptions, { ordered: false }).catch(console.log);
      inscriptions = [];
    }

    log(`${resolved} inscriptions inserted`);
  }

  log(`inscriptions completed after ${(performance.now() - ts) / 1000} seconds`);
}

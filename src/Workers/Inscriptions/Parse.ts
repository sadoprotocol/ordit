import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { DATA_DIR } from "../../Paths";
import { ord } from "../../Services/Ord";
import { readFile, writeFile } from "../../Utilities/Files";
import { log, perf } from "../Log";

export async function parse(blockHeight: number) {
  const inscriptionHeight = await getNextInscriptionHeight();
  if (inscriptionHeight === 0) {
    return;
  }

  if (inscriptionHeight > blockHeight) {
    return log("\n   💤 Indexer has latest inscriptions");
  }

  const ts = perf();

  log("\n   🕛 Waiting for block availability");
  await ord.waitForInscriptions(blockHeight);
  log(`\n     👌 Block available [${ts.now} seconds]`);

  const promises: Promise<any>[] = [];

  let inscriptions: Inscription[] = [];

  let height = inscriptionHeight;
  while (height <= blockHeight) {
    const ts = perf();
    const data = await ord.getBlockInscriptions(height);
    for (const inscription of data) {
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
    }
    promises.push(db.inscriptions.insertMany(inscriptions));
    log(`\n   📦 resolved ${inscriptions.length} inscriptions from block ${height} [${ts.now} seconds]`);
    inscriptions = [];
    height += 1;
  }
  await Promise.all(promises);
  await writeFile(`${DATA_DIR}/inscriptions_n`, blockHeight.toString());
  log(`\n   💾 Updated inscription height ${blockHeight}`);
}

async function getNextInscriptionHeight(): Promise<number> {
  const parsedHeight = await readFile(`${DATA_DIR}/inscriptions_n`);
  if (parsedHeight === undefined) {
    return 0;
  }
  return parseInt(parsedHeight, 10) + 1;
}

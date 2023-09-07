import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { DATA_DIR } from "../../Paths";
import { ord } from "../../Services/Ord";
import { readFile, writeFile } from "../../Utilities/Files";
import { getMetaFromTxId, isOIP2Meta, validateOIP2Meta } from "../../Utilities/Oip";
import { parseLocation } from "../../Utilities/Transaction";
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
  log(` [${ts.now} seconds]`);

  let inscriptions: Inscription[] = [];

  let height = inscriptionHeight;
  while (height <= blockHeight) {
    let ts = perf();
    log(`\n   📦 resolving inscriptions from block ${height}`);
    const list = await ord.getBlockInscriptions(height);
    log(` [${ts.now} seconds]`);
    for (const data of list) {
      const [txid] = parseLocation(data.output);
      const [media, format] = data.media.kind.split(";");
      const [type, subtype] = media.split("/");

      const inscription: Partial<Inscription> = {
        id: data.id,
        owner: data.address,
        sat: data.sat,
        mimeType: type,
        mimeSubtype: subtype,
        mediaType: media,
        mediaCharset: format?.split("=")[1],
        mediaSize: data.media.size,
        mediaContent: data.media.content,
        timestamp: data.timestamp,
        height: data.height,
        fee: data.fee,
        genesis: data.genesis,
        number: data.number,
        outpoint: data.output,
      };

      if (txid === data.genesis) {
        inscription.creator = data.address;
      }

      if (inscription.genesis === txid) {
        const meta = await getMetaFromTxId(inscription.genesis);
        if (meta) {
          inscription.meta = meta;
          if (isOIP2Meta(meta)) {
            inscription.verified = await validateOIP2Meta(meta);
          }
        }
      }

      inscriptions.push(inscription as Inscription);
    }
    ts = perf();
    log(`\n     📬 inserting ${inscriptions.length} inscriptions`);
    await db.inscriptions.insertMany(inscriptions);
    log(`\r     📭 inserted ${inscriptions.length} inscriptions [${ts.now} seconds]`);
    inscriptions = [];
    height += 1;
  }
  await writeFile(`${DATA_DIR}/inscriptions_n`, blockHeight.toString());
}

async function getNextInscriptionHeight(): Promise<number> {
  const parsedHeight = await readFile(`${DATA_DIR}/inscriptions_n`);
  if (parsedHeight === undefined) {
    throw new Error("Could not read inscriptions_n file");
  }
  return parseInt(parsedHeight, 10) + 1;
}

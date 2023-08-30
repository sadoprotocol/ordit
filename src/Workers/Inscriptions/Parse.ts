import { db } from "../../Database";
import { Brc20Event } from "../../Database/Brc20/Utilities";
import { Inscription } from "../../Database/Inscriptions";
import { DATA_DIR } from "../../Paths";
import { ord } from "../../Services/Ord";
import { readFile, writeFile } from "../../Utilities/Files";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { parseLocation } from "../../Utilities/Transaction";
import { getBrc20Event, parse as parceBrc20 } from "../Brc20/Parse";
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
  const brc20Events: { event: Brc20Event; inscription: Inscription }[] = [];

  let inscriptions: Inscription[] = [];

  let height = inscriptionHeight;
  while (height <= blockHeight) {
    const ts = perf();
    const list = await ord.getBlockInscriptions(height);
    for (const data of list) {
      const [current] = parseLocation(data.output);
      const [media, format] = data.media.kind.split(";");
      const [type, subtype] = media.split("/");
      const [txid] = parseLocation(data.output);

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

      if (inscription.genesis === current) {
        const meta = await getMetaFromTxId(inscription.genesis);
        if (meta) {
          inscription.meta = meta;
        }
      }

      const brc20Event = getBrc20Event(inscription as Inscription);
      if (brc20Event !== undefined) {
        brc20Events.push({
          event: brc20Event,
          inscription: inscription as Inscription,
        });
      }

      inscriptions.push(inscription as Inscription);
    }
    promises.push(db.inscriptions.insertMany(inscriptions));
    log(`\n   📦 resolved ${inscriptions.length} inscriptions from block ${height} [${ts.now} seconds]`);
    inscriptions = [];
    height += 1;
  }
  await Promise.all(promises);
  if (brc20Events.length > 0) {
    await parceBrc20(brc20Events);
  }
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

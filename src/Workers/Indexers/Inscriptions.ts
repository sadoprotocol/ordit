import { db } from "~Database";
import { Inscription } from "~Database/Inscriptions";
import { Indexer, IndexHandler, VinData } from "~Libraries/Indexer/Indexer";
import { INSCRIPTION_EPOCH_BLOCK } from "~Libraries/Inscriptions/Constants";
import { Envelope } from "~Libraries/Inscriptions/Envelope";
import { getInscriptionFromEnvelope, Inscription as RawInscription } from "~Libraries/Inscriptions/Inscription";
import { isOIP2Meta, validateOIP2Meta } from "~Libraries/Inscriptions/Oip";
import { perf } from "~Libraries/Log";
import { ord, OrdInscription } from "~Services/Ord";
import { parseLocation } from "~Utilities/Transaction";

export const inscriptionsIndexer: IndexHandler = {
  name: "inscriptions",

  async run(indexer: Indexer, { log, height }) {
    if (height < INSCRIPTION_EPOCH_BLOCK) {
      return log(`🚫 Inscriptions indexer has not passed epoch block`);
    }

    let ts = perf();
    log(`⏳ Waiting for block ${height.toLocaleString()}`);
    await ord.waitForBlock(height);
    log(`  ⌛ Resolved [${ts.now} seconds]`);

    ts = perf();
    const inscriptions = await getInscriptions(indexer.vins);
    log(`🚚 Delivering ${inscriptions.length.toLocaleString()} inscriptions [${ts.now} seconds]`);

    ts = perf();
    await insertInscriptions(inscriptions);
    log(`💾 Saved ${inscriptions.length.toLocaleString()} inscriptions [${ts.now} seconds]`);

    ts = perf();
    const transferCount = await transferInscriptions(indexer.vins.map(({ vout }) => `${vout.txid}:${vout.n}`));
    log(`💾 Transferred ${transferCount.toLocaleString()} inscriptions [${ts.now} seconds]`);
  },

  async reorg(height: number) {
    await db.inscriptions.deleteMany({ height: { $gte: height } });
  },
};

async function getInscriptions(vins: VinData[]) {
  const envelopes: Envelope[] = [];
  for (const vin of vins) {
    const envelope = Envelope.fromTxinWitness(vin.txid, vin.witness);
    if (envelope && envelope.isValid) {
      envelopes.push(envelope);
    }
  }

  const ordData = new Map<string, OrdInscription>();
  const chunkSize = 5_000;
  for (let i = 0; i < envelopes.length; i += chunkSize) {
    const chunk = envelopes.slice(i, i + chunkSize);
    const data = await ord.getInscriptionsForIds(chunk.map((item) => item.id));
    for (const item of data) {
      ordData.set(item.inscription_id, item);
    }
  }

  const inscriptions: RawInscription[] = [];
  for (const envelope of envelopes) {
    const inscription = await getInscriptionFromEnvelope(envelope, ordData);
    if (inscription !== undefined) {
      inscriptions.push(inscription);
    }
  }
  return inscriptions;
}

async function insertInscriptions(rawInscriptions: RawInscription[]) {
  const inscriptions: Inscription[] = [];

  for (const inscription of rawInscriptions) {
    const entry: Partial<Inscription> = {
      id: inscription.id,
      creator: inscription.creator,
      owner: inscription.owner,
      sat: inscription.sat,
      mimeType: inscription.media.mime.type,
      mimeSubtype: inscription.media.mime.subtype,
      mediaType: inscription.media.type,
      mediaCharset: inscription.media.charset,
      mediaSize: inscription.media.size,
      mediaContent: inscription.media.content,
      timestamp: inscription.timestamp,
      height: inscription.height,
      fee: inscription.fee,
      genesis: inscription.genesis,
      number: inscription.number,
      outpoint: inscription.outpoint,
      ometa: inscription.meta,
    };
    if (inscription.oip) {
      entry.meta = inscription.oip;
      if (isOIP2Meta(inscription.oip)) {
        entry.verified = await validateOIP2Meta(inscription.oip);
      }
    }
    inscriptions.push(entry as Inscription);
  }

  await db.inscriptions.insertMany(inscriptions);
}

async function transferInscriptions(outpoints: string[]) {
  if (outpoints.length === 0) {
    return 0;
  }

  const ids: string[] = [];
  let count = 0;

  const cursor = db.inscriptions.collection.find({ outpoint: { $in: outpoints } });
  while (await cursor.hasNext()) {
    const inscription = await cursor.next();
    if (inscription === null) {
      continue;
    }
    ids.push(inscription.id);
    if (ids.length === 2_500) {
      await commitTransfers(ids);
      count += ids.length;
      ids.length = 0;
    }
  }

  await commitTransfers(ids);

  return count + ids.length;
}

async function commitTransfers(ids: string[]) {
  const ops: { id: string; owner: string; outpoint: string }[] = [];
  const data = await ord.getInscriptionsForIds(ids);
  for (const item of data) {
    const [txid, n] = parseLocation(item.satpoint);
    const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
    ops.push({
      id: item.inscription_id,
      owner: output?.addresses[0] ?? "",
      outpoint: item.satpoint,
    });
  }
  await db.inscriptions.addTransfers(ops);
}

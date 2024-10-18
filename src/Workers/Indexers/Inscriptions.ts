import { db } from "~Database";
import { Inscription } from "~Database/Inscriptions";
import { Indexer, IndexHandler, VinData } from "~Libraries/Indexer/Indexer";
import { INSCRIPTION_EPOCH_BLOCK } from "~Libraries/Inscriptions/Constants";
import { Envelope } from "~Libraries/Inscriptions/Envelope";
import { getInscriptionFromEnvelope, Inscription as RawInscription } from "~Libraries/Inscriptions/Inscription";
import { isOIP2Meta, validateOIP2Meta } from "~Libraries/Inscriptions/Oip";
import { limiter } from "~Libraries/Limiter";
import { perf } from "~Libraries/Log";
import { ord } from "~Services/Ord";
import { parseLocation } from "~Utilities/Transaction";

export const inscriptionsIndexer: IndexHandler = {
  name: "inscriptions",

  async run(indexer: Indexer, { log, height }) {
    if (height < INSCRIPTION_EPOCH_BLOCK) {
      return;
    }

    log(`\n[Inscriptions indexer]`);
    let ts = perf();
    log(`⏳ Waiting for block ${height.toLocaleString()}`);
    await ord.waitForBlock(height);
    log(`⏳ Resolved [${ts.now} seconds]`);

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
  let currentTxid = "";
  let currentEnvelopeIndex = 0;
  const inscriptionLimiter = limiter(10);

  for (const vin of vins) {
    if (vin.txid !== currentTxid) {
      currentTxid = vin.txid;
      currentEnvelopeIndex = 0;
    }

    const _envelopes = Envelope.fromTxinWitness(vin.txid, vin.witness, currentEnvelopeIndex);

    if (_envelopes) {
      for (const envelope of _envelopes) {
        if (envelope && envelope.isValid) {
          const inscriptionPromise = (async () => {
            try {
              const data = await ord.getInscription(envelope.id);
              if (data) {
                return await getInscriptionFromEnvelope(envelope, data);
              }
            } catch (error) {
              console.error(`Error processing envelope ${envelope.id}:`, error);
            }
            return undefined;
          })();
          inscriptionLimiter.push(() => inscriptionPromise);
        }
      }
      currentEnvelopeIndex += _envelopes.length;
    }
  }

  const inscriptionsArray = await inscriptionLimiter.run();
  const inscriptions = inscriptionsArray.filter(
    (inscription): inscription is RawInscription => inscription !== undefined,
  );

  return inscriptions;
}

export async function insertInscriptions(rawInscriptions: RawInscription[]) {
  const inscriptions: Inscription[] = [];

  for (const inscription of rawInscriptions) {
    const entry: Partial<Inscription> = {
      id: inscription.id,
      delegate: inscription.delegate,
      creator: inscription.creator,
      owner: inscription.owner,
      sat: inscription.sat,
      mimeType: inscription.media.mime.type,
      mimeSubtype: inscription.media.mime.subtype,
      mediaType: inscription.media.type,
      mediaEncoding: inscription.media.encoding,
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
    if (inscription.parents) {
      entry.parents = inscription.parents;
    }
    inscriptions.push(entry as Inscription);
  }

  await db.inscriptions.insertMany(inscriptions);
}

async function transferInscriptions(outpoints: string[]) {
  if (outpoints.length === 0) {
    return 0;
  }

  let count = 0;

  const chunkSize = 10_000;
  for (let i = 0; i < outpoints.length; i += chunkSize) {
    const chunk = outpoints.slice(i, i + chunkSize);
    const docs = await db.inscriptions.collection
      .find({ outpoint: { $in: chunk } })
      .project({ id: 1 })
      .toArray();
    await commitTransfers(docs.map((doc) => doc.id));
    count += docs.length;
  }

  return count;
}

async function commitTransfers(ids: string[]) {
  const limit = limiter(10);

  for (const id of ids) {
    limit.push(async () => {
      try {
        const item = await ord.getInscription(id);
        if (item) {
          const [txid, n] = parseLocation(item.satpoint);
          const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
          return {
            id: item.id,
            owner: output?.addresses[0] ?? "",
            outpoint: `${txid}:${n}`,
          };
        }
      } catch (error) {
        console.error(`Error processing id ${id}:`, error);
        return null;
      }
    });
  }

  const results = await limit.run();
  const ops = results.filter((op): op is { id: string; owner: string; outpoint: string } => op !== null);
  await db.inscriptions.addTransfers(ops);
}

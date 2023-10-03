import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { Inscription as RawInscription } from "../../Libraries/Inscriptions/Inscription";
import { isOIP2Meta, validateOIP2Meta } from "../../Libraries/Inscriptions/Oip";
import { log, perf } from "../../Libraries/Log";
import { Block, isCoinbase, rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { parseLocation } from "../../Utilities/Transaction";

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
  await ord.waitForBlock(blockHeight);
  log(` [${ts.now} seconds]`);

  let height = inscriptionHeight;
  while (height <= blockHeight) {
    const ts = perf();
    log(`\n   📦 resolving inscriptions in block ${height}`);
    const block = await rpc.blockchain.getBlock(height, 2);
    log(`\n     🕛 resolved block [${ts.now} seconds]`);

    await handleInscriptionsInBlock(block);
    await handleInscriptionTransfers(block);

    height += 1;
  }

  await db.inscriptions.setBlockNumber(blockHeight);
}

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getNextInscriptionHeight(): Promise<number> {
  const parsedHeight = await db.inscriptions.getBlockNumber();
  if (parsedHeight === undefined) {
    throw new Error("Could not read inscriptions_n file");
  }
  return parsedHeight + 1;
}

async function handleInscriptionsInBlock(block: Block<2>) {
  let ts = perf();

  log(`\n     🔬 scanning for inscriptions`);

  // ### Map Inscriptions
  // Look through all block transactions and identify ord inscriptions
  // present in the txinwitness scripts.

  const rawInscriptions: RawInscription[] = [];
  for (const tx of block.tx) {
    const inscription = await RawInscription.fromTransaction(tx);
    if (inscription) {
      rawInscriptions.push(inscription);
    }
  }

  log(`\n       🔍 resolved ${rawInscriptions.length.toLocaleString()} inscriptions [${ts.now} seconds]`);

  if (rawInscriptions.length === 0) {
    return;
  }

  // ### Prepare Inscriptions
  // Go through the inscription map and prepare the inscriptions
  // for insertion into the database.

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
      meta: inscription.oip,
    };

    if (inscription.oip && isOIP2Meta(inscription.oip)) {
      entry.verified = await validateOIP2Meta(inscription.oip);
    }

    inscriptions.push(entry as Inscription);
  }

  log(`\n       🛠️ prepared ${inscriptions.length.toLocaleString()} inscriptions [${ts.now} seconds]`);

  if (inscriptions.length > 0) {
    ts = perf();
    await db.inscriptions.insertMany(inscriptions);
    log(`\n       📬 inserted ${inscriptions.length.toLocaleString()} inscriptions [${ts.now} seconds]`);
  }
}

async function handleInscriptionTransfers(block: Block<2>) {
  let ts = perf();

  log(`\n     🔬 scanning for transfers`);

  // ### Get Spents
  // Go through each transaction inputs and map their outpoints.

  const outputs: string[] = [];
  for (const tx of block.tx) {
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        break;
      }
      outputs.push(`${vin.txid}:${vin.vout}`);
    }
  }

  log(`\n       💿 processed ${outputs.length.toLocaleString()} vins [${ts.now} seconds]`);

  // ### Transfer
  // Find any inscription where the spent outpoints match the inscription.
  // When we find matching inscriptions it means they have been moved to
  // a new location.

  ts = perf();
  const transfers = await db.inscriptions.find({ outpoint: { $in: outputs } });
  log(`\n       🔍 found ${transfers.length.toLocaleString()} transfers [${ts.now} seconds]`);

  if (transfers.length > 0) {
    const ops: { id: string; owner: string; outpoint: string }[] = [];

    ts = perf();

    // ### Retrieve Satpoints
    // Retrieve the new satpoints for every identified transfer as well as
    // resolving the new owner address for the inscription.

    const chunkSize = 1000;
    for (let i = 0; i < transfers.length; i += chunkSize) {
      const chunk = transfers.slice(i, i + chunkSize);
      const data = await ord.getInscriptionsForIds(chunk.map((item) => item.id));
      for (const item of data) {
        const [txid, n] = parseLocation(item.satpoint);
        const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
        ops.push({
          id: item.inscription_id,
          owner: output?.addresses[0] ?? "",
          outpoint: item.satpoint,
        });
      }
    }

    await db.inscriptions.addTransfers(ops);

    log(`\n       📬 transfered ${transfers.length.toLocaleString()} inscriptions [${ts.now} seconds]`);
  }
}

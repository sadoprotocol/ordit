import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { log, perf } from "../../Libraries/Log";
import { Block, isCoinbase, rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { getInscriptionContent } from "../../Utilities/Inscriptions";
import { isOIP2Meta, validateOIP2Meta } from "../../Utilities/Oip";

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

  const map: InscriptionMap = {};
  for (const tx of block.tx) {
    const data = getInscriptionContent(tx);
    if (data) {
      map[`${tx.txid}i0`] = {
        id: `${tx.txid}i0`,
        genesis: tx.txid,
        ...data,
        media: {
          type: data.media.type,
          content: data.media.content.toString("base64"),
          length: data.media.content.length,
        },
      } as InscriptionMap[string];
    }
  }

  log(`\n       🔍 found ${Object.keys(map).length.toLocaleString()} inscriptions [${ts.now} seconds]`);

  if (Object.keys(map).length === 0) {
    return;
  }

  // ### Resolve Data
  // Resolve additional inscription data from the ord api and local
  // outputs collection.

  ts = perf();

  await getInscriptionData(map);
  await getInscriptionCreator(map);
  await getInscriptionOwner(map);

  if (Object.keys(map).length === 0) {
    return;
  }

  // ### Prepare Inscriptions
  // Go through the inscription map and prepare the inscriptions
  // for insertion into the database.

  const inscriptions: Inscription[] = [];

  for (const data of Object.values(map)) {
    const [media, format = ""] = data.media.type.split(";");
    const [type, subtype] = media.split("/");
    const [, charset = ""] = format.split("=");

    const entry: Partial<Inscription> = {
      id: data.id,
      creator: data.creator,
      owner: data.owner,
      sat: data.sat,
      mimeType: type,
      mimeSubtype: subtype,
      mediaType: media,
      mediaCharset: charset,
      mediaSize: data.media.length,
      mediaContent: data.media.content,
      timestamp: data.timestamp,
      height: data.height,
      fee: data.fee,
      genesis: data.genesis,
      number: data.number,
      outpoint: data.outpoint,
    };

    if (data.meta) {
      entry.meta = data.meta;
      if (isOIP2Meta(data.meta)) {
        entry.verified = await validateOIP2Meta(data.meta);
      }
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
        const [txid, vout] = item.satpoint.split(":");
        const output = await db.outputs.findOne({ "vout.txid": txid, "vout.n": parseInt(vout) });
        ops.push({
          id: item.inscription_id,
          owner: output?.addresses[0] ?? "",
          outpoint: `${txid}:${vout}`,
        });
      }
    }

    await db.inscriptions.addTransfers(ops);

    log(`\n       📬 transfered ${transfers.length.toLocaleString()} inscriptions [${ts.now} seconds]`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

async function getInscriptionData(inscriptions: InscriptionMap) {
  const ts = perf();

  const ids = Object.keys(inscriptions);

  const data = await ord.getInscriptionsForIds(ids);
  for (const item of data) {
    const [txid, vout] = item.satpoint.split(":");
    inscriptions[item.inscription_id].number = item.number;
    inscriptions[item.inscription_id].height = item.genesis_height;
    inscriptions[item.inscription_id].fee = item.genesis_fee;
    inscriptions[item.inscription_id].sat = item.sat;
    inscriptions[item.inscription_id].outpoint = `${txid}:${vout}`;
    inscriptions[item.inscription_id].timestamp = item.timestamp;
  }

  for (const id of ids) {
    const hasData = data.find((item) => item.inscription_id === id);
    if (!hasData) {
      delete inscriptions[id];
    }
  }

  log(`\n         📗 resolved inscription data [${ts.now} seconds]`);
}

async function getInscriptionCreator(inscriptions: InscriptionMap) {
  const ts = perf();

  const values = Object.values(inscriptions).map((item) => item.genesis);
  if (values.length === 0) {
    return;
  }
  const data = await db.outputs.find({ "vout.txid": { $in: values }, "vout.n": 0 });
  for (const item of data) {
    inscriptions[`${item.vout.txid}i0`].creator = item.addresses[0];
  }

  log(`\n         📘 resolved inscription creator [${ts.now} seconds]`);
}

async function getInscriptionOwner(inscriptions: InscriptionMap) {
  const ts = perf();

  const outpoints: any = {};
  const ts2 = perf();
  const values = Object.values(inscriptions).map((item) => {
    outpoints[item.outpoint] = item.id;
    return item.outpoint.split(":");
  });
  log(`\n           🔖 produced ${values.length.toLocaleString()} vout outpoints [${ts2.now} seconds]`);
  if (values.length === 0) {
    return;
  }
  const ts3 = perf();
  const data = await db.outputs.find({
    $or: values.map((item) => ({ "vout.txid": item[0], "vout.n": parseInt(item[1]) })),
  });
  log(`\n           🔖 queried ${data.length.toLocaleString()} outputs [${ts3.now} seconds]`);
  for (const item of data) {
    inscriptions[outpoints[`${item.vout.txid}:${item.vout.n}`]].owner = item.addresses[0];
  }

  log(`\n         📙 resolved inscription owner [${ts.now} seconds]`);
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type InscriptionMap = {
  [id: string]: {
    id: string;
    genesis: string;
    creator: string;
    owner: string;
    media: {
      type: string;
      content: string;
      length: number;
    };
    number: number;
    height: number;
    fee: number;
    sat: number;
    outpoint: string;
    timestamp: number;
    meta?: Object;
  };
};

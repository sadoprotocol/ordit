import debug from "debug";

import { parseOffer } from "../../Models/Sado/Utilities/ParseOffer";
import { parseOrder } from "../../Models/Sado/Utilities/ParseOrder";
import { SADO_DATA } from "../../Paths";
import { Block, RawTransaction, Transactions } from "../../Services/Bitcoin";
import { readDir, readFile, removeFile, writeFile } from "../../Utilities/Files";

const log = debug("sado-parser");

export async function parse() {
  const blocks = await readDir(SADO_DATA);
  if (blocks.length === 0) {
    return log("all items processed");
  }
  log("processing %d items", blocks.length);
  for (const block of blocks) {
    const data = await readFile(`${SADO_DATA}/${block}`);
    if (data === undefined) {
      return;
    }
    const json = getParsedBlock(data);
    if (json === undefined) {
      throw new Error(`Failed to parse block ${block}`);
    }
    for (const { cid, txid } of json.orders) {
      log("processing order %s", cid);
      await parseOrder(cid, { ...json.block, txid });
    }
    for (const { cid, txid } of json.offers) {
      log("processing offer %s", cid);
      await parseOffer(cid, { ...json.block, txid });
    }
    await removeFile(`${SADO_DATA}/${block}`);
  }
}

export async function parseBlock(block: Block & Transactions) {
  const orders: SadoEntry[] = [];
  const offers: SadoEntry[] = [];

  const txs = getSadoTransactions(block.tx);
  for (const { type, cid, txid } of txs) {
    switch (type) {
      case "order": {
        orders.push({ cid, txid });
        break;
      }
      case "offer": {
        offers.push({ cid, txid });
        break;
      }
    }
  }

  if (orders.length === 0 && offers.length === 0) {
    return;
  }

  await writeFile(
    `${SADO_DATA}/${block.height}`,
    JSON.stringify({
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
      },
      orders,
      offers,
    })
  );
}

function getParsedBlock(data: string): SadoBlock | undefined {
  try {
    return JSON.parse(data) as SadoBlock;
  } catch {
    return;
  }
}

function getSadoTransactions(txs: RawTransaction[]): SadoTransaction[] {
  const sadoTxs: SadoTransaction[] = [];
  for (const tx of txs) {
    for (const vout of tx.vout) {
      const utf8 = getNullData(vout.scriptPubKey.asm);
      if (utf8 === undefined) {
        continue;
      }
      const sado = parseSadoOutput(utf8);
      if (sado === undefined) {
        continue;
      }
      sadoTxs.push({ type: sado.type, cid: sado.cid, txid: tx.txid });
    }
  }
  return sadoTxs;
}

function getNullData(asm: string): string | undefined {
  if (asm.includes("OP_RETURN")) {
    return Buffer.from(asm.replace("OP_RETURN", "").trim(), "hex").toString();
  }
}

function parseSadoOutput(utf8?: string): Omit<SadoTransaction, "txid"> | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer" || type === "collection") {
      return { type, cid };
    }
  }
}

type SadoBlock = {
  block: {
    hash: string;
    height: number;
    time: number;
  };
  orders: SadoEntry[];
  offers: SadoEntry[];
};

type SadoEntry = Omit<SadoTransaction, "type">;

type SadoTransaction = {
  type: SadoType;
  cid: string;
  txid: string;
};

type SadoType = "order" | "offer" | "collection";

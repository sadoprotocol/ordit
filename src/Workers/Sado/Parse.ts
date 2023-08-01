import debug from "debug";

import { limiter } from "../../Libraries/Limiter";
import { SadoDocument, SadoOffer } from "../../Models/Sado";
import { parseOffer } from "../../Models/Sado/Utilities/ParseOffer";
import { parseOrder } from "../../Models/Sado/Utilities/ParseOrder";
import { SADO_DATA } from "../../Paths";
import { Block, RawTransaction, Transactions } from "../../Services/Bitcoin";
import { readDir, readFile, removeFile, writeFile } from "../../Utilities/Files";

const log = debug("sado-parser");

const queue = limiter(20);

export async function parse() {
  const blocks = await readDir(SADO_DATA);
  if (blocks.length === 0) {
    return log("all items processed");
  }
  log("processing %d items", blocks.length);
  // for (const block of blocks) {
  //   queue.push(async () => {
  //     const data = await readFile(`${PARSER_DATA}/${block}`);
  //     if (data === undefined) {
  //       writeFile(`${PARSER_ERROR}/${block}`, `Could not read block file ${block}`);
  //       return;
  //     }
  //     const spents = JSON.parse(data);
  //     return setSpentOutputs(spents).then(() => {
  //       removeFile(`${PARSER_DATA}/${block}`);
  //       log("block %d processed %d spents", block, spents.length);
  //     });
  //   });
  // }
  await queue.run();
}

export async function parseBlock(block: Block & Transactions) {
  const orders: string[] = [];
  const offers: string[] = [];

  const txs = getSadoTransactions(block.tx);
  for (const { type, cid } of txs) {
    switch (type) {
      case "order": {
        orders.push(cid);
        break;
      }
      case "offer": {
        offers.push(cid);
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

type SadoTransaction = {
  type: SadoType;
  cid: string;
  txid: string;
};

type SadoType = "order" | "offer" | "collection";

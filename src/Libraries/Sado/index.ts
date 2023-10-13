import { VoutData } from "~Libraries/Indexer";

import { getNullData } from "../../Utilities/Transaction";
import { order } from "./Order";

export const sado = {
  order,
  getTransactions,
  getOutput,
  getUtf8,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

function getTransactions(vouts: VoutData[]): SadoTransaction[] {
  const result: SadoTransaction[] = [];
  for (const vout of vouts) {
    const output = sado.getOutput(vout);
    if (output !== undefined) {
      result.push({
        type: output.type,
        cid: output.cid,
        block: { hash: vout.block.hash, height: vout.block.height, time: vout.block.time },
        tx: { txid: vout.txid, n: vout.n },
      });
    }
  }
  return result;
}

function getOutput(vout: VoutData): SadoOutput | undefined {
  const utf8 = getUtf8(vout);
  if (utf8 !== undefined) {
    const sado = parseSadoOutput(utf8);
    if (sado !== undefined) {
      return sado;
    }
  }
}

function getUtf8(vout: VoutData): string | undefined {
  const utf8 = getNullData(vout.scriptPubKey.asm);
  if (utf8 !== undefined && utf8.includes("sado=") === true) {
    return utf8;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function parseSadoOutput(utf8?: string): SadoOutput | undefined {
  if (utf8?.includes("sado=") === true) {
    const [, vs] = utf8.split("=");
    const [type, cid] = vs.split(":");
    if (type === "order" || type === "offer" || type === "collection") {
      return { type, cid };
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type SadoEntry = Omit<SadoTransaction, "type">;

export type SadoOutput = Omit<SadoTransaction, "block" | "tx">;

export type SadoTransaction = {
  type: SadoType;
  cid: string;
  block: {
    hash: string;
    height: number;
    time: number;
  };
  tx: {
    txid: string;
    n: number;
  };
};

export type SadoType = "order" | "offer" | "collection";

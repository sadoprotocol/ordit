import { RawTransaction } from "../Services/Bitcoin";
import { getNullData } from "./Transaction";

export const sado = {
  getTransactions,
  getOutput,
  getUtf8,
  parseOrderbookListing,
  parseSadoOutput,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

function getTransactions(txs: RawTransaction[]): SadoTransaction[] {
  const result: SadoTransaction[] = [];
  for (const tx of txs) {
    const output = sado.getOutput(tx);
    if (output !== undefined) {
      result.push({ type: output.type, cid: output.cid, txid: tx.txid });
    }
  }
  return result;
}

function getOutput(tx: RawTransaction): SadoOutput | undefined {
  const utf8 = getUtf8(tx);
  if (utf8 !== undefined) {
    const sado = parseSadoOutput(utf8);
    if (sado !== undefined) {
      return sado;
    }
  }
}

function getUtf8(tx: RawTransaction): string | undefined {
  for (const vout of tx.vout) {
    const utf8 = getNullData(vout.scriptPubKey.asm);
    if (utf8 !== undefined && utf8.includes("sado=") === true) {
      return utf8;
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function parseOrderbookListing(value: string): [string, number] {
  const [address, price] = value.split(":");
  if (address === undefined) {
    throw new Error("Invalid orderbook listing");
  }
  return [address, price === undefined ? 600 : parseInt(price)];
}

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

export type SadoOutput = Omit<SadoTransaction, "txid">;

export type SadoTransaction = {
  type: SadoType;
  cid: string;
  txid: string;
};

export type SadoType = "order" | "offer" | "collection";

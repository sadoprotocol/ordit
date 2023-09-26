import { script } from "bitcoinjs-lib";

import { db } from "../Database";
import { isCoinbase, rpc } from "../Services/Bitcoin";
import { makeObjectKeyChecker } from "../Services/IPFS";
import { validateCoreSignature, validateOrditSignature } from "./Signatures";

const hasValidOip2Keys = makeObjectKeyChecker(["p", "v", "ty", "col", "iid", "publ", "nonce", "sig"]);

export async function getMetaFromTxId(txid: string): Promise<any> {
  const tx = await rpc.transactions.getRawTransaction(txid, true);
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    if (vin.txinwitness) {
      return getMetaFromWitness(vin.txinwitness);
    }
  }
  return undefined;
}

/**
 * Get OIP meta data from witness.
 *
 * Check if the witness contains hash for application/json;charset=utf-8
 * hash 6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38
 *
 * @param txinwitness - Witness to get meta data from.
 */
export function getMetaFromWitness(txinwitness: string[]): Object | undefined {
  const jsonHash = "6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38";

  const witness = txinwitness.find((witnessItem) => witnessItem.includes(jsonHash));
  if (witness === undefined) {
    return undefined;
  }

  const data = script.decompile(Buffer.from(witness, "hex"));
  if (data === null) {
    return undefined;
  }

  const chunks = data.map((chunk) => chunk.toString());

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i] === "application/json;charset=utf-8") {
      startIndex = i + 2; // skip the OP pushes after metadata mime-type itself
    } else if (chunks[i] === "104") {
      endIndex = i;
    }
  }

  if (startIndex === -1 || endIndex === -1) {
    return undefined;
  }

  try {
    return JSON.parse(
      chunks
        .slice(startIndex, endIndex)
        .filter((chunk) => chunk.includes("\x00") === false)
        .join("")
    );
  } catch (error) {
    console.log("Error parsing json from witness", {
      error,
      chunks,
      startIndex,
      endIndex,
      meta: chunks.slice(startIndex, endIndex).join(""),
    });
    return undefined;
  }
}

export async function validateOIP2Meta(meta?: any): Promise<boolean> {
  if (meta === undefined || !isOIP2Meta(meta)) {
    return false;
  }
  const origin = await db.inscriptions.findOne({
    $or: [{ id: meta.col }, { id: meta.col.replace(":", "i") }, { id: `${meta.col}i0` }],
  });
  if (origin === undefined) {
    return false;
  }
  const iid = origin.meta.insc.find((insc: any) => insc.iid === meta.iid);
  if (iid === undefined || iid.limit < meta.nonce) {
    return false;
  }
  const message = `${meta.col} ${meta.iid} ${meta.nonce}`;
  try {
    const valid = validateOrditSignature(message, meta.publ, meta.sig);
    if (valid === true) {
      return true;
    }
  } catch {
    // ...
  }
  try {
    const valid = validateCoreSignature(meta.publ, meta.sig, message);
    if (valid === true) {
      return true;
    }
  } catch {
    // ...
  }
  return false;
}

export function isOIP2Meta(meta: any): meta is OIP2Meta {
  const hasKeys = hasValidOip2Keys(meta);
  if (hasKeys === false || meta.p !== "vord" || meta.v !== 1 || meta.ty !== "insc") {
    return false;
  }
  return true;
}

export type OIP2Meta = {
  p: "vord";
  v: 1;
  ty: "insc";
  col: string;
  iid: string;
  publ: string;
  nonce: number;
  sig: string;
};

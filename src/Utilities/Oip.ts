import { isCoinbase, rpc } from "../Services/Bitcoin";

export async function getMetaFromTxId(txid: string): Promise<any> {
  const tx = await rpc.transactions.getRawTransaction(txid, true);
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    return getMetaFromWitness(vin.txinwitness);
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
export async function getMetaFromWitness(txinwitness: string[]): Promise<object | undefined> {
  const jsonHash = "6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38";

  const meta = txinwitness.find((witnessItem) => witnessItem.includes(jsonHash));
  if (meta === undefined) {
    return undefined;
  }

  // ### Decode Meta
  // Decode the meta data from the witness using bitcoin core.

  const decodedScript = await rpc.transactions.decodeScript(meta);
  if (decodedScript === undefined) {
    return undefined;
  }

  // ### Build JSON
  // Split the asm into its individual parts. The actual content is sliced buffers and
  // bitcoin op codes. Find the index of the application/json;charset=utf-8 hash and
  // slice the array from that point. Then create the expected json data by concatenating
  // subsequent sliced buffers that is not undefined or "0". Once we hit an OP_CODE we
  // assume the end is reached and attempt to parse the json.

  let json = "";

  const asm = decodedScript.asm.split(" ");
  const jsonIndex = asm.findIndex((item) => item === jsonHash);

  const partials = asm.slice(jsonIndex + 1);
  for (const data of partials) {
    if (data === undefined || data === "0") {
      continue; // skip data that is not part of the application/json
    }
    if (data.includes("OP")) {
      return JSON.parse(Buffer.from(json, "hex").toString("utf8"));
    }
    json += data;
  }
}

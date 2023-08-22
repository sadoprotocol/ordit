import { isCoinbase, rpc } from "../Services/Bitcoin";

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
export async function getMetaFromWitness(txinwitness: string[]): Promise<object | undefined> {
  const jsonHash = "6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38";

  let witness = txinwitness.find((witnessItem) => witnessItem.includes(jsonHash));
  if (witness === undefined) {
    return undefined;
  }

  const jsonIndex = witness.indexOf(jsonHash);
  if (jsonIndex !== -1) {
    witness = witness.slice(jsonIndex + jsonHash.length);
  }

  // ### Data
  // Convert the witness buffer and convert it to a utf8 string.

  const data = Buffer.from(witness, "hex").toString("utf8");

  // ### JSON
  // Extract the json string from the data. The json string is wrapped in a buffer

  const json = extractJsonString(data);
  if (json === undefined) {
    return undefined;
  }

  // ### Sanitize
  // Write side chunking produces additional non printable characters. In this case
  // a consistent pattern of "M\b\x02" is added to the json string. The following
  // code removes this combination of characters and any additional non printable
  // characters.

  let sanitized = "";

  json.split("").forEach((char, i) => {
    if (char === "M" && json[i + 1] === "\b" && json[i + 2] === "\x02") {
      return;
    }
    if (char === "\b" && json[i + 1] === "\x02") {
      return;
    }
    if (char === "\x02") {
      return;
    }
    sanitized += char;
  });

  sanitized = sanitized.replace(/[^\x20-\x7E]/g, "");

  // ### Parse JSON
  // Parse the sanitized json string into a javascript object.

  try {
    return JSON.parse(sanitized);
  } catch (error) {
    console.log("Error parsing json from witness", { error });
    return undefined;
  }
}

/**
 * Extract JSON string from a string containing surrounding non JSON characters.
 *
 * @param str - String containing JSON string.
 */
function extractJsonString(str: string): string | undefined {
  const jsonObjectStart = str.indexOf("{");
  const jsonObjectEnd = str.lastIndexOf("}");
  if (jsonObjectStart !== -1 && jsonObjectEnd !== -1 && jsonObjectEnd > jsonObjectStart) {
    return str.slice(jsonObjectStart, jsonObjectEnd + 1);
  }
}

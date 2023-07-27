import { Big, BigSource } from "big.js";

import { Vout } from "../Services/Bitcoin";

/**
 * Get the number of satoshis from a value.
 *
 * @param value - Value to convert to satoshis.
 */
export function sats(value: BigSource): number {
  return new Big(value).times(1e8).round(0, 0).toNumber();
}

/**
 * Clean up scriptPubKey data by removing non-standard data to prevent
 * corruption of the database records.
 *
 * @param scriptPubKey - Script public key to sanitize.
 */
export function sanitizeScriptPubKey(scriptPubKey: Vout["scriptPubKey"]) {
  if (scriptPubKey.type === "nonstandard") {
    scriptPubKey.asm = "";
    scriptPubKey.desc = "";
    scriptPubKey.hex = "";
  }
}

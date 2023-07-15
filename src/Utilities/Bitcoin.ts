import { config } from "../Config";
import { Vout } from "../Services/Bitcoin";

/**
 * Get the number of satoshis from a value.
 *
 * @param value   - Value to convert to satoshis.
 * @param decimal - Number of decimal places to use.
 */
export function sats(value: number, decimal = config.chain.decimals): number {
  return Math.ceil(value * 10 ** decimal);
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

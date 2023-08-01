import { Big, BigSource } from "big.js";

import { Vout } from "../Services/Bitcoin";
import { currency } from "./Currency";

export const BTC_TO_SAT = 1e8;

/**
 * Get the number of satoshis from a value.
 *
 * @param value - Value to convert to satoshis.
 */
export function sats(value: BigSource): number {
  return new Big(value).times(1e8).round(0, 0).toNumber();
}

export function satToBtc(sat: number): number {
  return sat / BTC_TO_SAT;
}

export function btcToSat(btc: number): number {
  return Math.floor(btc * BTC_TO_SAT);
}

export function btcToUsd(btc: number): number {
  return btc * currency.USD.value;
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

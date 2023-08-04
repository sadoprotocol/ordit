import { Big, BigSource } from "big.js";

import { Vout } from "../Services/Bitcoin";
import { currency } from "./Currency";

export const BTC_TO_SAT = 1e8;

export function satToBtc(sat: BigSource): number {
  return new Big(sat).div(BTC_TO_SAT).toNumber();
}

export function btcToSat(btc: BigSource): number {
  return new Big(btc).times(BTC_TO_SAT).round(0, 0).toNumber();
}

export function btcToUsd(btc: BigSource): number {
  return new Big(btc).times(currency.USD.value).toNumber();
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

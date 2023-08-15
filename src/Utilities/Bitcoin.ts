import { Big, BigSource } from "big.js";

import { currency } from "./Currency";

export const BTC_TO_SAT = 1e8;

export function satToBtc(sat: BigSource): number {
  return new Big(sat).div(BTC_TO_SAT).toNumber();
}

export function satToUsd(sat: BigSource): number {
  return new Big(sat).div(BTC_TO_SAT).times(currency.USD.value).toNumber();
}

export function btcToSat(btc: BigSource): number {
  return new Big(btc).times(BTC_TO_SAT).round(0, 0).toNumber();
}

export function btcToUsd(btc: BigSource): number {
  return new Big(btc).times(currency.USD.value).toNumber();
}

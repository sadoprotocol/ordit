import { Big, BigSource } from "big.js";

import { currency } from "./Currency";

const addressFormats = {
  mainnet: {
    p2pkh: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // legacy
    p2sh: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // segwit
    bech32: /^(bc1q)[a-zA-HJ-NP-Z0-9]{14,74}$/, // bech32
    taproot: /^(bc1p)[a-zA-HJ-NP-Z0-9]{14,74}$/, // taproot
  },
  other: {
    p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    p2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
    bech32: /^(tb1q|bcrt1q)[a-zA-HJ-NP-Z0-9]{14,74}$/,
    taproot: /^(tb1p|bcrt1p)[a-zA-HJ-NP-Z0-9]{14,74}$/,
  },
} as const;

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

export function getAddressType(address: string): AddressType | undefined {
  for (const network of Object.keys(addressFormats) as ["mainnet", "other"]) {
    if (addressFormats[network].p2pkh.test(address)) {
      return "p2pkh";
    }
    if (addressFormats[network].p2sh.test(address)) {
      return "p2sh";
    }
    if (addressFormats[network].bech32.test(address)) {
      return "bech32";
    }
    if (addressFormats[network].taproot.test(address)) {
      return "taproot";
    }
  }
}

export type AddressType = "p2pkh" | "p2sh" | "bech32" | "taproot";

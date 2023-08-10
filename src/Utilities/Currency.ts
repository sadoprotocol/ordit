import debug from "debug";
import fetch from "node-fetch";

const log = debug("ordit-api");

export const currency: Currency = {};

export async function startCurrencyTracker() {
  await setCurrency();
  setInterval(setCurrency, 1000 * 60 * 15);
}

/*
 |--------------------------------------------------------------------------------
 | Dex Price Updater
 |--------------------------------------------------------------------------------
 */

async function setCurrency(): Promise<void> {
  const res = await fetch("https://blockchain.info/ticker");
  if (res.status !== 200) {
    return;
  }

  const data = await res.json();
  for (const key in data) {
    currency[key] = {
      value: data[key].last,
      symbol: data[key].symbol,
    };
  }

  log("USD: %d | SGD: %d | CNY: %d", currency.USD.value, currency.SGD.value, currency.CNY.value);
}

type Currency = {
  [key: string]: {
    value: number;
    symbol: string;
  };
};

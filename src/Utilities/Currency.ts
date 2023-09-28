import fetch from "node-fetch";

import { log } from "../Libraries/Log";

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

  const data = (await res.json()) as any;
  for (const key in data) {
    currency[key] = {
      value: data[key].last,
      symbol: data[key].symbol,
    };
  }

  log(
    `\n💵 currency tracker [ USD: ${currency.USD.value.toLocaleString()} | SGD: ${currency.SGD.value.toLocaleString()} | CNY: ${currency.CNY.value.toLocaleString()} ]`,
  );
}

type Currency = {
  [key: string]: {
    value: number;
    symbol: string;
  };
};

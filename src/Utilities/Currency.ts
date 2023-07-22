import fetch from "node-fetch";

import { Response, ResponseError } from "./Response";

let cache: Currency | undefined;
let cacheTime: number;

export async function getCurrency(): Promise<Response<Currency, CurrencyFetchError>> {
  const current = getCachedCurrency();
  if (current !== undefined) {
    return current;
  }

  const res = await fetch("https://blockchain.info/ticker");
  if (res.status !== 200) {
    return CurrencyFetchError.Report();
  }

  const data = await res.json();

  const result: Currency = {};
  for (const key in data) {
    result[key] = {
      value: data[key].last,
      symbol: data[key].symbol,
    };
  }
  cache = result;

  return cache;
}

function getCachedCurrency(): Currency | undefined {
  const isStaleCache = cacheTime + 1000 * 60 * 15 < Date.now();
  if (isStaleCache) {
    cache = undefined;
  }
  return cache;
}

class CurrencyFetchError extends ResponseError {
  constructor() {
    super("Failed to fetch currency data");
  }
}

type Currency = {
  [key: string]: {
    value: number;
    symbol: string;
  };
};

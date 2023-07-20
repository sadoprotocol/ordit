import { InternalError, method } from "@valkyr/api";
import fetch from "node-fetch";

let cache: any;

export const getCurrency = method({
  handler: async () => {
    if (cache !== undefined) {
      return cache;
    }
    const res = await fetch("https://blockchain.info/ticker");
    if (res.status !== 200) {
      throw new InternalError("Failed to fetch currency data");
    }

    const data = await res.json();

    const result: any = {};
    for (const key in data) {
      result[key] = {
        value: data[key].last,
        symbol: data[key].symbol,
      };
    }
    cache = result;

    return cache;
  },
});

setInterval(() => {
  cache = undefined;
}, 1000 * 60 * 15);

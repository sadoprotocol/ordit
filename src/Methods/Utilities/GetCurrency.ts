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
    cache = await res.json();
    return cache;
  },
});

setInterval(() => {
  cache = undefined;
}, 1000 * 60 * 15);

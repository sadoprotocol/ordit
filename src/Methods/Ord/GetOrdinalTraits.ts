import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { hasToken } from "../../Actions/HasToken";
import { ord } from "../../Services/Ord";

export const getOrdinalTraits = method({
  params: Schema({
    satoshi: number,
  }),
  actions: [hasToken],
  handler: async ({ satoshi }) => {
    return ord.traits(satoshi);
  },
});

import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { ord } from "../../Services/Ord";

export const getLatestInscriptionIds = method({
  params: Schema({
    limit: number.max(100).optional(),
    from: number.optional(),
  }),
  handler: async ({ limit = 50, from }) => {
    return ord.latestInscriptionIds(limit, from);
  },
});

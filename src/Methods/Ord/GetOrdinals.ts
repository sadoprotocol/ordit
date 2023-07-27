import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "../../Services/Ord";

export const getOrdinals = method({
  params: Schema({
    location: string,
  }),
  handler: async ({ location }) => {
    return ord.list(location);
  },
});

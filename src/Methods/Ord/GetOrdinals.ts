import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { hasToken } from "../../Actions/HasToken";
import { ord } from "../../Services/Ord";

export const getOrdinals = method({
  params: Schema({
    location: string,
  }),
  actions: [hasToken],
  handler: async ({ location }) => {
    return ord.list(location);
  },
});

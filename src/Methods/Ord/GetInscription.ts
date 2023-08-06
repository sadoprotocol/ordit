import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "../../Services/Ord";

export const getInscription = method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    return ord.inscription(id);
  },
});

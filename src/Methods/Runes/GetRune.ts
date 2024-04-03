import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "~Services/Ord";

export default method({
  params: Schema({
    runeQuery: string,
  }),
  handler: async ({ runeQuery }) => {
    const runeDetail = await ord.getRuneDetail(runeQuery);
    return runeDetail;
  },
});

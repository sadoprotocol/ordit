import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

export default method({
  params: Schema({
    runeTicker: string,
  }),
  handler: async ({ runeTicker }) => {
    return await runes.getEtchingByTicker(runeTicker);
  },
});

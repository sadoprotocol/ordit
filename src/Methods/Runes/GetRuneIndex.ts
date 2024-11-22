import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";
import { convertBigIntToString } from "~Utilities/Helpers";

export default method({
  params: Schema({
    runeTicker: string.optional(),
    runeId: string.optional(),
  }),
  handler: async ({ runeTicker, runeId }) => {
    let response = null;
    if (runeTicker) response = await runes.getEtchingByTicker(runeTicker);
    if (runeId) response = await runes.getEtching(runeId);

    if (response) {
      delete response._id;
      response = convertBigIntToString(response);
    }
    return response;
  },
});

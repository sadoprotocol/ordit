import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

export default method({
  params: Schema({
    runeTicker: string,
  }),
  handler: async ({ runeTicker }) => {
    const rune = await runes.findRune(runeTicker);
    if (rune === undefined) {
      throw new NotFoundError("Rune not found");
    }
    return rune;
  },
});

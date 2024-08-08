import { method, NotFoundError } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";

import { runes } from "~Database/Runes";

export default method({
  params: Schema({
    runeTicker: string,
    verbose: boolean.optional(),
  }),
  handler: async ({ runeTicker, verbose = false }) => {
    const rune = await runes.findRune(runeTicker, verbose);
    if (rune === undefined) {
      throw new NotFoundError("Rune not found");
    }
    return rune;
  },
});

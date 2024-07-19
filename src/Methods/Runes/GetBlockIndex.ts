import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

export default method({
  params: Schema({
    height: string,
  }),
  handler: async ({ height }) => {
    const rune = await runes.findBlock(Number(height));
    if (rune === undefined) {
      throw new NotFoundError("Rune not found");
    }
    return rune;
  },
});

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { decodeTick, encodeTick } from "../../Database/Brc20/Utilities";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    tick: string,
  }),
  handler: async ({ tick }) => {
    const result = await db.brc20.tokens.findOne({ tick: encodeTick(tick) });
    if (!result) {
      throw new NotFoundError("Token not found");
    }
    result.tick = decodeTick(result.tick);
    return stripMongoId(result);
  },
});

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    tick: string,
  }),
  handler: async ({ tick }) => {
    const result = await db.brc20.tokens.findOne({ tick });
    if (!result) {
      throw new NotFoundError("Token not found");
    }
    return stripMongoId(result);
  },
});

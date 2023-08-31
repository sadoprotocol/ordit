import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    tick: string,
  }),
  handler: async ({ tick }) => {
    return db.brc20.tokens.findOne({ tick }).then(stripMongoId);
  },
});

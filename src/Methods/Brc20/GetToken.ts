import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    token: string,
  }),
  handler: async ({ token }) => {
    return db.brc20.tokens.findOne({ tick: token }).then(stripMongoId);
  },
});

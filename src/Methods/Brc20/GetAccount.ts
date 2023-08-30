import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return db.brc20.accounts.getAccount(address).then(stripMongoId);
  },
});
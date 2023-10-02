import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { db } from "../../../Database";
import { TokenTransfer } from "../../../Database/Brc20/Transfers/Collection";
import { stripMongoIdFromMany } from "../../../Services/Mongo";

export default method({
  params: Schema({
    address: string,
    tick: string.optional(),
  }),
  handler: async ({ address, tick }) => {
    const filter: Filter<TokenTransfer> = { "from.address": address, to: null };
    if (tick) {
      filter.slug = tick.toLowerCase();
    }
    return db.brc20.transfers.find(filter).then(stripMongoIdFromMany);
  },
});

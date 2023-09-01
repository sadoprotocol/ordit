import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { db } from "../../Database";
import { TokenTransfer } from "../../Database/Brc20/Transfers/Collection";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    filter: Schema({
      inscription: string.optional(),
      tick: string.optional(),
      from: string.optional(),
      to: string.optional(),
    }).optional(),
    sort: schema.sort.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ filter: data = {}, sort = {}, pagination = {} }) => {
    const filter: Filter<TokenTransfer> = {};
    if (data.inscription) {
      filter.inscription = data.inscription;
    }
    if (data.tick) {
      filter.tick = data.tick;
    }
    if (data.from) {
      filter["from.address"] = data.from;
    }
    if (data.to) {
      filter["to.address"] = data.to;
    }
    return db.brc20.transfers.findPaginated({ ...pagination, filter, sort });
  },
});

import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { db } from "../../Database";
import { TokenTransfer } from "../../Database/Brc20/Transfers/Collection";
import { decodeTick, encodeTick } from "../../Database/Brc20/Utilities";
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
      filter.tick = encodeTick(data.tick);
    }
    if (data.from) {
      filter["from.address"] = data.from;
    }
    if (data.to) {
      filter["to.address"] = data.to;
    }
    const result = await db.brc20.transfers.findPaginated({
      ...pagination,
      filter,
      sort,
      transform: (document) => {
        document.tick = decodeTick(document.tick);
      },
    });
    return {
      transfers: result.documents,
      pagination: result.pagination,
    };
  },
});

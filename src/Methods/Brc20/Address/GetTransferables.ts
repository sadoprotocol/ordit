import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { db } from "../../../Database";
import { TokenTransfer } from "../../../Database/Brc20/Transfers/Collection";
import { schema } from "../../../Libraries/Schema";

export default method({
  params: Schema({
    address: string,
    tick: string.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ address, tick, pagination }) => {
    const filter: Filter<TokenTransfer> = { "from.address": address, to: null };
    if (tick) {
      filter.slug = tick.toLowerCase();
    }
    const result = await db.brc20.transfers.findPaginated({ ...pagination, filter });
    return {
      transferables: result.documents,
      pagination: result.pagination,
    };
  },
});

import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    tick: string,
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ tick, pagination }) => {
    const result = await db.brc20.holders.findPaginated({ ...pagination, filter: { tick, total: { $gt: 0 } } });
    return {
      tokens: result.documents,
      pagination: result.pagination,
    };
  },
});

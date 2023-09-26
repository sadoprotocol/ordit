import { method } from "@valkyr/api";
import Schema from "computed-types";

import { db } from "../../Database";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    sort: schema.sort.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ sort = {}, pagination = {} }) => {
    const result = await db.brc20.tokens.findPaginated({ ...pagination, sort });
    return {
      tokens: result.documents,
      pagination: result.pagination,
    };
  },
});

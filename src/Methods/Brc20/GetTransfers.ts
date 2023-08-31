import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
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
  handler: async ({ filter = {}, sort = {}, pagination = {} }) => {
    return db.brc20.transfers.findPaginated({ ...pagination, filter, sort });
  },
});

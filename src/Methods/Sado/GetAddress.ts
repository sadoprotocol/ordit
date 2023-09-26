import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";
import { getPagination, pagination } from "../../Utilities/Pagination";

export default method({
  params: Schema({
    address: string,
    sort: Schema({
      height: Schema.either("asc" as const, "desc" as const).optional(),
    }).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, sort, pagination }) => {
    const filter = { addresses: address };
    return {
      entries: (
        await db.sado.find(filter, {
          ...getPagination(pagination),
          sort: {
            height: sort?.height === "asc" ? 1 : -1,
          },
        })
      ).map(stripMongoId),
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        total: await db.sado.count(filter),
      },
    };
  },
});

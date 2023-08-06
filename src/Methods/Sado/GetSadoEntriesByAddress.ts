import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { stripMongoId } from "../../Services/Mongo";
import { getPagination, pagination } from "../../Utilities/Pagination";

export const getSadoEntriesByAddress = method({
  params: Schema({
    address: string,
    pagination: pagination.optional(),
  }),
  handler: async ({ address, pagination }) => {
    const filter = { addresses: address };
    return {
      entries: (await db.sado.find(filter, getPagination(pagination))).map(stripMongoId),
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await db.sado.count(filter),
      },
    };
  },
});

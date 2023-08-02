import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getSadoCount, getSadoEntries } from "../../Models/Sado";
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
      entries: (await getSadoEntries(filter, getPagination(pagination))).map(stripMongoId),
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await getSadoCount(filter),
      },
    };
  },
});

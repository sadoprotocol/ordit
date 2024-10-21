import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { RuneOutput, runes } from "~Database/Runes";
import { FindPaginatedParams } from "~Libraries/Paginate";

import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    address: string,
    runeTicker: string.optional(),
    pagination: schema.pagination.optional(),
    sort: schema.sort,
  }),
  handler: async ({ address, runeTicker, pagination = {}, sort }) => {
    pagination.limit ??= 100;
    sort ??= { _id: "asc" };

    const filter: Filter<RuneOutput> = {
      address,
      ...(runeTicker && { runeTicker }),
      spentTxid: { $exists: false },
    };

    const params: FindPaginatedParams<RuneOutput> = {
      ...pagination,
      filter,
      sort,
      cursorInfo: false,
    };

    const balances = await runes.addressRunesUTXOs(params);
    return {
      balances: balances.documents,
      pagination: balances.pagination,
    };
  },
});

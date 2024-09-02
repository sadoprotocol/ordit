import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { RuneUtxoBalance } from "runestone-lib";

import { runes } from "~Database/Runes";
import { FindPaginatedParams } from "~Libraries/Paginate";

import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    address: string,
    runeTicker: string,
    pagination: schema.pagination.optional(),
    sort: schema.sort,
  }),
  handler: async ({ address, runeTicker, pagination = {}, sort }) => {
    pagination.limit ??= 50;
    sort ??= { _id: "asc" };
    const params: FindPaginatedParams<RuneUtxoBalance> = {
      ...pagination,
      filter: { address, runeTicker },
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

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
  }),
  handler: async ({ address, runeTicker, pagination = {} }) => {
    const params: FindPaginatedParams<RuneUtxoBalance> = { ...pagination, filter: { address, runeTicker } };
    const balances = await runes.addressRunesUTXOs(params);

    return {
      balances: balances.documents,
      pagination: balances.pagination,
    };
  },
});

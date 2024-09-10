import { method } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";
import { Filter } from "mongodb";
import { RuneUtxoBalance } from "runestone-lib";

import { db } from "~Database";
import { OutputDocument } from "~Database/Output";
import { runes } from "~Database/Runes";
import { FindPaginatedParams } from "~Libraries/Paginate";

import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    address: string,
    runeTicker: string.optional(),
    pagination: schema.pagination.optional(),
    sort: schema.sort,
    includeSpent: boolean.optional(),
    includeSatValue: boolean.optional(),
  }),
  handler: async ({ address, runeTicker, pagination = {}, sort, includeSpent = false, includeSatValue = false }) => {
    pagination.limit ??= 50;
    sort ??= { _id: "asc" };

    const filter: Filter<RuneUtxoBalance> = { address };
    if (runeTicker) {
      filter.runeTicker = runeTicker;
    }
    if (!includeSpent) {
      filter.spentTxid = { $exists: false };
    }
    const params: FindPaginatedParams<RuneUtxoBalance> = {
      ...pagination,
      filter,
      sort,
      cursorInfo: false,
    };

    const balances = await runes.addressRunesUTXOs(params);
    if (includeSatValue) {
      await Promise.all(
        balances.documents.map(async (balance: any) => {
          const filter: Filter<OutputDocument> = { "vout.txid": balance.txid, "vout.n": balance.vout };
          const vout = await db.outputs.findOne(filter);
          if (vout?.value) {
            balance.value = vout.value;
          }
        }),
      );
    }
    return {
      balances: balances.documents,
      pagination: balances.pagination,
    };
  },
});

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { RuneUtxoBalance } from "runestone-lib";

import { runes } from "~Database/Runes";

export default method({
  params: Schema({
    address: string,
    runeTicker: string,
  }),
  handler: async ({ address, runeTicker }): Promise<RuneUtxoBalance[]> => {
    const balances = await runes.addressRunesUTXOs(address, runeTicker);
    if (balances === null) {
      throw new NotFoundError("Address not found");
    }
    return balances;
  },
});

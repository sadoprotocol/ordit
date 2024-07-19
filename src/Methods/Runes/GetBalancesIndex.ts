import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

type RuneBalance = {
  balance: bigint;
  rune_metadata: {
    divisibility: number;
    symbol: string;
    name: string; // with spacers
  };
};

type RuneBalanceMap = {
  [runeTicker: string]: RuneBalance;
};

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }): Promise<RuneBalanceMap> => {
    const balances = await runes.addressBalances(address);
    if (balances === null) {
      throw new NotFoundError("Address not found");
    }

    const responseBalances: RuneBalanceMap = {};
    for (const balance of balances) {
      const rune = await runes.findRune(balance.runeTicker);
      if (rune === null || !rune.valid) {
        throw new NotFoundError("Rune not found");
      }

      const currentBalance = responseBalances[balance.runeTicker];

      if (currentBalance) {
        currentBalance.balance += balance.amount;
      } else {
        responseBalances[balance.runeTicker] = {
          balance: balance.amount,
          rune_metadata: {
            divisibility: rune.divisibility ?? 0,
            symbol: rune.symbol ?? "",
            name: rune.runeName,
          },
        };
      }
    }

    return responseBalances;
  },
});

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

type RuneBalance = {
  balance: string;
  rune_metadata?: {
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
    if (balances.length === 0) {
      throw new NotFoundError("Address has no balances");
    }

    const responseBalances: RuneBalanceMap = {};
    for (const balance of balances) {
      balance.amount = BigInt(balance.amount);
      const currentBalance = responseBalances[balance.runeTicker];

      if (currentBalance) {
        currentBalance.balance = (BigInt(currentBalance.balance) + balance.amount).toString();
      } else {
        responseBalances[balance.runeTicker] = {
          balance: balance.amount.toString(),
        };
      }
    }

    const runeTickers = Object.keys(responseBalances);
    const runesMetadata = await runes.findRunes(runeTickers);
    for (const runesData of runesMetadata) {
      responseBalances[runesData.runeTicker].rune_metadata = {
        divisibility: runesData.divisibility ?? 0,
        symbol: runesData.symbol ?? "",
        name: runesData.runeName,
      };
    }

    return responseBalances;
  },
});

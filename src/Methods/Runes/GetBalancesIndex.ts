import { method } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";

import { runes } from "~Database/Runes";

type RuneBalance = {
  balance: string;
  rune_metadata?: {
    divisibility: number;
    symbol: string;
    name: string; // with spacers
    id: string;
    inscriptionId?: string;
  };
};

type RuneBalanceMap = {
  [runeTicker: string]: RuneBalance;
};

export default method({
  params: Schema({
    address: string,
    verbose: boolean.optional(),
  }),
  handler: async ({ address, verbose = false }): Promise<RuneBalanceMap> => {
    const balancesArray: { runeTicker: string; balance: string }[] = await runes.addressBalances(address);

    const balancesMap: RuneBalanceMap = balancesArray.reduce((acc, { runeTicker, balance }) => {
      acc[runeTicker] = { balance };
      return acc;
    }, {} as RuneBalanceMap);

    if (verbose) {
      await Promise.all(
        Object.keys(balancesMap).map(async (runeTicker) => {
          const etching = await runes.getEtchingByTicker(runeTicker);
          if (etching && etching.valid) {
            const { runeId, runeName, txid, divisibility, symbol } = etching;

            balancesMap[runeTicker].rune_metadata = {
              divisibility: divisibility ?? 0,
              symbol: symbol ?? "",
              name: runeName ?? "",
              id: `${runeId.block}:${runeId.tx}`,
              inscriptionId: txid ? `${txid}i0` : undefined,
            };
          }
        }),
      );
    }

    return balancesMap;
  },
});

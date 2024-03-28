import { method } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";

import { ord } from "~Services/Ord";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";

export default method({
  params: Schema({
    address: string,
    showOutpoints: boolean.optional(),
  }),
  handler: async ({ address, showOutpoints }) => {
    const outputs = await db.outputs.find({ addresses: address, ...noSpentsFilter });
    if (!outputs) {
      return [];
    }

    const runeOutputsBalances = await ord.getRuneOutputsBalancesByOutpoints(
      outputs.map((output) => `${output.vout.txid}:${output.vout.n}`),
    );

    // sum the balances that have the same name.
    const entries = Object.entries(runeOutputsBalances);
    const runeBalancesMap = new Map<string, RuneBalance>();
    for (let i = 0; i < entries.length; i += 1) {
      const outpoint = entries[i][0];
      const runeOutputBalances = entries[i][1];

      for (let j = 0; j < runeOutputBalances.length; j += 1) {
        const runeOutput = runeOutputBalances[j];

        const runeMap = runeBalancesMap.get(runeOutput.rune_spaced);
        let outpoints: [string, string][] | undefined;

        if (runeMap) {
          if (showOutpoints) {
            outpoints = [...runeMap.outpoints!, [outpoint, runeOutput.amount]];
          }

          runeBalancesMap.set(runeOutput.rune_spaced, {
            ...runeMap,
            amount: (BigInt(runeMap.amount) + BigInt(runeOutput.amount)).toString(),
            outpoints,
          });

          continue;
        }

        if (showOutpoints) {
          outpoints = [[outpoint, runeOutput.amount]];
        }

        runeBalancesMap.set(runeOutput.rune_spaced, {
          rune_spaced: runeOutput.rune_spaced,
          amount: runeOutput.amount,
          divisibility: runeOutput.divisibility,
          symbol: runeOutput.symbol,
          outpoints,
        });
      }
    }

    return Array.from(runeBalancesMap).map((v) => v[1]);
  },
});

type RuneBalance = {
  rune_spaced: string;
  amount: string;
  divisibility: number;
  symbol?: string;
  outpoints?: [string, string][];
};

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { runes } from "~Database/Runes";

import { db } from "../../Database";

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
      const inscriptionId = `${runesData.txid}i0`;
      const inscription = await db.inscriptions.getInscriptionById(inscriptionId);

      responseBalances[runesData.runeTicker].rune_metadata = {
        divisibility: runesData.divisibility ?? 0,
        symbol: runesData.symbol ?? "",
        name: runesData.runeName,
        id: `${runesData.runeId.block}:${runesData.runeId.tx}`,
      };
      if (inscription !== undefined) {
        responseBalances[runesData.runeTicker].rune_metadata = {
          ...responseBalances[runesData.runeTicker].rune_metadata,
          inscriptionId,
        };
      }
    }

    return responseBalances;
  },
});

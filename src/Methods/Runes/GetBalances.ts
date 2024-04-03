import { method } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";

import { ord } from "~Services/Ord";
import { btcToSat } from "~Utilities/Bitcoin";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { Outpoint, RuneBalance, UTXO } from "../../Libraries/Runes/types";
import { rpc } from "../../Services/Bitcoin";

export default method({
  params: Schema({
    address: string,
    showOutpoints: boolean.optional(),
    utxo: boolean.optional(),
  }),
  handler: async ({ address, showOutpoints, utxo }) => {
    const outputs = await db.outputs.find({ addresses: address, ...noSpentsFilter });
    if (!outputs) {
      return [];
    }

    const runeOutputsBalances = await ord.getRuneOutputsBalancesByOutpoints(
      outputs.map((output) => `${output.vout.txid}:${output.vout.n}`),
    );

    const outputUTXOMap = new Map<string, UTXO>();
    if (showOutpoints && utxo) {
      const runeOutpoints = Object.keys(runeOutputsBalances);

      for (let i = 0; i < runeOutpoints.length; i += 1) {
        const [txid, nstr] = runeOutpoints[i].split(":");
        const n = parseInt(nstr, 10);
        const tx = await rpc.transactions.getRawTransaction(txid, true);

        const vout = tx.vout[n];

        const utxo: UTXO = {
          txid,
          n,
          sats: btcToSat(vout.value),
          scriptPubKey: vout.scriptPubKey,
        };

        outputUTXOMap.set(`${txid}:${n}`, utxo);
      }
    }

    // sum the balances that have the same name.
    const entries = Object.entries(runeOutputsBalances);
    const runeBalancesMap = new Map<string, RuneBalance>();
    for (let i = 0; i < entries.length; i += 1) {
      const outpoint = entries[i][0];
      const runeOutputBalances = entries[i][1];

      for (let j = 0; j < runeOutputBalances.length; j += 1) {
        const runeOutput = runeOutputBalances[j];

        const runeMap = runeBalancesMap.get(runeOutput.spaced_rune);
        let outpoints: Outpoint[] | undefined;

        if (runeMap) {
          if (showOutpoints) {
            outpoints = [
              ...runeMap.outpoints!,
              {
                outpoint,
                amount: runeOutput.amount,
                utxo: utxo ? outputUTXOMap.get(outpoint)! : undefined,
              },
            ];
          }

          runeBalancesMap.set(runeOutput.spaced_rune, {
            ...runeMap,
            amount: (BigInt(runeMap.amount) + BigInt(runeOutput.amount)).toString(),
            outpoints,
          });

          continue;
        }

        if (showOutpoints) {
          outpoints = [
            {
              outpoint,
              amount: runeOutput.amount,
              utxo: utxo ? outputUTXOMap.get(outpoint)! : undefined,
            },
          ];
        }

        runeBalancesMap.set(runeOutput.spaced_rune, {
          spaced_rune: runeOutput.spaced_rune,
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

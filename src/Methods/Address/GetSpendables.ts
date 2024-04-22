import { BadRequestError, method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";
import { getSafeToSpendState, ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";

const MAX_SPENDABLES = 200;

export default method({
  params: Schema({
    address: string,
    value: number,
    safetospend: boolean.optional(),
    filter: array.of(string).optional(),
  }),
  handler: async ({ address, value, safetospend = true, filter = [] }) => {
    const spendables = [];

    let totalValue = 0;
    let safeToSpend = 0;
    let scanned = 0;

    const cursor = db.outputs.collection.find({ addresses: address, ...noSpentsFilter }, { sort: { value: -1 } });
    while (await cursor.hasNext()) {
      const output = await cursor.next();
      if (output === null) {
        continue;
      }

      scanned += 1;

      const outpoint = `${output.vout.txid}:${output.vout.n}`;
      if (filter.includes(outpoint)) {
        continue;
      }

      // ### Safe To Spend
      // Any output that has an inscription or ordinal of rarity higher than
      // configured treshold is not safe to spend.

      if (safetospend === true) {
        const outpoint = `${output.vout.txid}:${output.vout.n}`;
        const [inscriptions, ordinals, runeBalances] = await Promise.all([
          db.inscriptions.getInscriptionsByOutpoint(outpoint),
          ord.getOrdinals(outpoint),
          ord.getRuneOutputsBalancesByOutpoint(outpoint),
        ]);

        if (getSafeToSpendState(ordinals, inscriptions, runeBalances) === false) {
          continue;
        }
        safeToSpend += 1;
      }

      // ### Transaction
      // We need to pull the raw transaction here to get the scriptPubKey.
      // [TODO] We can potentially add this to the output index.

      const vout = await rpc.transactions.getTxOut(output.vout.txid, output.vout.n, true);
      if (vout === undefined) {
        continue;
      }

      // ### Add Spendable

      spendables.push({
        txid: output.vout.txid,
        n: output.vout.n,
        sats: btcToSat(output.value),
        scriptPubKey: vout.scriptPubKey,
      });

      totalValue += output.value;
      if (totalValue >= value || spendables.length >= MAX_SPENDABLES) {
        break;
      }
    }

    if (totalValue < value) {
      throw new BadRequestError("Insufficient funds", {
        requested: value,
        available: totalValue,
        spendables: {
          scanned,
          safeToSpend: safetospend === true ? safeToSpend : "disabled",
        },
      });
    }

    return spendables;
  },
});

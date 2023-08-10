import { BadRequestError, method } from "@valkyr/api";
import Schema, { array, number, string } from "computed-types";

import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getOrdinalsByOutpoint } from "../../Utilities/Transaction";

export const getSpendables = method({
  params: Schema({
    address: string,
    value: number,
    allowedrarity: array.of(string).optional(),
    filter: array.of(string).optional(),
    limit: number.optional(),
  }),
  handler: async ({ address, value, allowedrarity = ["common", "uncommon"], filter = [], limit }) => {
    const spendables = [];

    let totalValue = 0;
    let safeToSpend = 0;
    let scanned = 0;

    const cursor = db.outputs.collection.find({ addresses: address, vin: { $exists: false } }, { sort: { value: -1 } });
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

      const inscriptions = await ord.inscriptions(outpoint);
      if (inscriptions.length > 0) {
        continue;
      }

      const ordinals = await getOrdinalsByOutpoint(outpoint);
      for (const ordinal of ordinals) {
        if (allowedrarity.includes(ordinal.rarity) === false) {
          continue;
        }
      }

      safeToSpend += 1;

      // ### Transaction
      // We need to pull the raw transaction here to get the scriptPubKey.
      // [TODO] We can potentially add this to the output index.

      const tx = await rpc.transactions.getRawTransaction(output.vout.txid, true);
      if (tx === undefined) {
        continue;
      }

      // ### Add Spendable

      spendables.push({
        txid: output.vout.txid,
        n: output.vout.n,
        value: output.value,
        sats: btcToSat(output.value),
        scriptPubKey: tx.vout[output.vout.n].scriptPubKey,
      });

      totalValue += output.value;
      if (totalValue >= value) {
        break;
      }

      if (limit !== undefined && spendables.length === limit) {
        break;
      }
    }

    if (totalValue < value) {
      throw new BadRequestError("Insufficient funds", {
        requested: value,
        available: totalValue,
        spendables: {
          scanned,
          safeToSpend,
        },
      });
    }

    return spendables;
  },
});

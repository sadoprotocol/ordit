import { BadRequestError, method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";
import { isRunestone, tryDecodeRunestone } from "runestone-lib";

import { getTransaction } from "~Utilities/Transaction";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";
import { getSafeToSpendState, ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";

const MAX_LIMIT = 200;

async function outputHasRunes(outpoint: string): Promise<boolean> {
  const [txid, n] = outpoint.split(":");
  const tx = await getTransaction(txid);
  if (!tx) return false;
  const decipher = tryDecodeRunestone(tx);
  if (!decipher) return false;
  if (!isRunestone(decipher)) return false;

  const pointer = decipher.pointer ?? 1;
  if (decipher.etching || decipher.mint) {
    if (Number(n) === pointer) return true;
  }
  if (decipher.edicts) {
    decipher.edicts.forEach((edict) => {
      if (Number(n) === edict.output) return true;
    });
  }

  return false;
}

export default method({
  params: Schema({
    address: string,
    value: number,
    safetospend: boolean.optional(),
    filter: array.of(string).optional(),
    limit: number.optional(),
  }),
  handler: async ({ address, value, safetospend = true, filter = [], limit }) => {
    const spendables = [];

    let totalValue = 0;
    let safeToSpend = 0;
    let scanned = 0;

    const outputs = await db.outputs.collection
      .find({ addresses: address, ...noSpentsFilter }, { sort: { value: -1 } })
      .toArray();
    for (const output of outputs) {
      scanned += 1;
      const outpoint = `${output.vout.txid}:${output.vout.n}`;
      if (filter.includes(outpoint)) {
        continue;
      }

      // ### Safe To Spend
      // Any output that has an inscription or ordinal of rarity higher than
      // configured threshold is not safe to spend.

      if (safetospend === true) {
        const outpoint = `${output.vout.txid}:${output.vout.n}`;
        const [inscriptions, ordinals, hasRunes] = await Promise.all([
          db.inscriptions.getInscriptionsByOutpoint(outpoint),
          ord.getOrdinals(outpoint),
          outputHasRunes(outpoint),
        ]);

        if (getSafeToSpendState(ordinals, inscriptions, hasRunes) === false) {
          continue;
        }
        safeToSpend += 1;
      }

      // ### Transaction
      // We need to pull the transaction here to get the scriptPubKey.
      // This also checks if the transaction has been spent or is in the mempool.
      const vout = await rpc.transactions.getTxOut(output.vout.txid, output.vout.n, true);
      if (vout === null) {
        // if vout is null, then the output has been spent or is in the mempool (or is invalid for some reason)
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
      // if (totalValue >= value || spendables.length >= (limit ?? MAX_LIMIT)) {
      //   break;
      // }
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

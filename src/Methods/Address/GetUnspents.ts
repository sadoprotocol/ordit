import { method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";

import { outputHasRunes } from "~Utilities/Runes";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";
import { getSafeToSpendState, ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";

const options = Schema({
  safetospend: boolean.optional(),
  allowedrarity: array.of(string).optional(),
});

const sort = Schema({
  value: Schema.either("asc" as const, "desc" as const).optional(),
});

const pagination = Schema({
  limit: number.optional(),
  prev: string.optional(),
  next: string.optional(),
});

export default method({
  params: Schema({
    address: string,
    options: options.optional(),
    sort: sort.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, sort, pagination }) => {
    let result: any[] = [];
    let cursors: string[] = [];

    const height = await rpc.blockchain.getBlockCount();
    const limit = pagination?.limit ?? 10;
    const from = pagination?.next ?? pagination?.prev;
    const reverse = pagination?.prev !== undefined;

    let shouldSkipOutput = true;

    const cursor = db.outputs.collection.find(
      {
        addresses: address,
        ...noSpentsFilter,
      },
      { sort: { value: reverse ? (sort?.value === "asc" ? -1 : 1) : sort?.value === "asc" ? 1 : -1 } },
    );

    while (await cursor.hasNext()) {
      const output = await cursor.next();
      if (output === null) {
        continue;
      }

      if (from !== undefined) {
        if (output._id.toString() === from) {
          shouldSkipOutput = false;
          continue;
        }
        if (shouldSkipOutput) {
          continue;
        }
      }

      // ### Transaction
      // We need to pull the transaction here to get the scriptPubKey.
      // This also checks if the transaction has been spent or is in the mempool.
      const vout = await rpc.transactions.getTxOut(output.vout.txid, output.vout.n, true);
      if (vout === null) {
        continue;
      }

      const utxo: any = {
        txid: output.vout.txid,
        n: output.vout.n,
        sats: btcToSat(vout.value),
        scriptPubKey: vout.scriptPubKey,
      };

      if (vout.scriptPubKey.type === "pubkeyhash") {
        // We need to pull the raw transaction here to get the scriptPubKey.
        const tx = await rpc.transactions.getRawTransaction(output.vout.txid, true);
        utxo.txhex = tx.hex;
      }

      const outpoint = `${output.vout.txid}:${output.vout.n}`;

      const [inscriptions, ordinals, runeBalances] = await Promise.all([
        db.inscriptions.getInscriptionsByOutpoint(outpoint),
        ord.getOrdinals(outpoint),
        outputHasRunes(outpoint),
      ]);

      // DEPRECATED, REMOVE WHEN CLIENT CATCHES UP
      utxo.ordinals = ordinals;
      utxo.inscriptions = inscriptions;
      utxo.runes = runeBalances;

      utxo.safeToSpend = getSafeToSpendState(ordinals, inscriptions, runeBalances, options?.allowedrarity);
      utxo.confirmation = height - output.vout.block.height + 1;

      if (options?.safetospend === true && utxo.safeToSpend === false) {
        continue;
      }

      result.push(utxo);
      cursors.push(output._id.toString());

      if (result.length === limit) {
        break;
      }
    }

    result = reverse ? result.reverse() : result;
    cursors = reverse ? cursors.reverse() : cursors;

    const prev = from === undefined ? null : cursors[0] ?? null;
    const next = cursors[cursors.length - 1] ?? null;

    return {
      unspents: result,
      pagination: {
        limit,
        prev: reverse ? ((await cursor.hasNext()) ? prev : null) : prev,
        next: reverse ? next : (await cursor.hasNext()) ? next : null,
      },
    };
  },
});

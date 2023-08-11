import { method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";
import { WithId } from "mongodb";

import { db } from "../../Database";
import { OutputDocument } from "../../Database/Output";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getInscriptionsByOutpoint, getOrdinalsByOutpoint, getSafeToSpendState } from "../../Utilities/Transaction";

const options = Schema({
  ord: boolean.optional(),
  safetospend: boolean.optional(),
  allowedrarity: array.of(string).optional(),
});

const pagination = Schema({
  limit: number.optional(),
  prev: string.optional(),
  next: string.optional(),
});

export const getUnspents = method({
  params: Schema({
    address: string,
    format: Schema.either("legacy" as const, "next" as const).optional(),
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ format = "legacy", address, options, pagination }) => {
    let result: any[] = [];
    let cursors: string[] = [];

    const height = await rpc.blockchain.getBlockCount();
    const limit = pagination?.limit ?? 10;
    const from = pagination?.next ?? pagination?.prev;
    const reverse = pagination?.prev !== undefined;

    const cursor = db.outputs.collection.find(
      { addresses: address, vin: { $exists: false } },
      { sort: { value: reverse ? 1 : -1 } }
    );

    while (await cursor.hasNext()) {
      const output = await cursor.next();
      if (output === null || shouldSkipOutput(output, from, reverse)) {
        continue;
      }

      const tx = await rpc.transactions.getRawTransaction(output.vout.txid, true);
      if (tx === undefined) {
        continue;
      }

      const vout = tx.vout[output.vout.n];
      const utxo: any = {
        txid: output.vout.txid,
        n: output.vout.n,
        blockHash: output.vout.block.hash,
        blockN: output.vout.block.height,
        scriptPubKey: vout.scriptPubKey,
        value: vout.value,
        sats: btcToSat(vout.value),
      };

      if (options?.ord !== false) {
        utxo.ordinals = await getOrdinalsByOutpoint(`${output.vout.txid}:${output.vout.n}`);
        utxo.inscriptions = await getInscriptionsByOutpoint(
          `${output.vout.txid}:${output.vout.n}`,
          await getMetaFromTxId(output.vout.txid)
        );
      }

      utxo.safeToSpend = getSafeToSpendState(
        utxo.ordinals ?? [],
        utxo.inscriptions ?? [],
        options?.allowedrarity ?? ["common", "uncommon"]
      );
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

    if (format === "legacy") {
      return result;
    }

    result = reverse ? result.reverse() : result;
    cursors = reverse ? cursors.reverse() : cursors;

    const prev = cursors.shift();
    const next = cursors.pop();

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

function shouldSkipOutput(output: WithId<OutputDocument>, from?: string, reverse = false) {
  if (from === undefined) {
    return false;
  }
  if (reverse === false) {
    return output._id.toString() >= from;
  }
  return output._id.toString() <= from;
}

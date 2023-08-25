import { method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";

const options = Schema({
  ord: boolean.optional(),
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
    format: Schema.either("legacy" as const, "next" as const).optional(),
    options: options.optional(),
    sort: sort.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ format = "legacy", address, options, sort, pagination }) => {
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
      { sort: { value: reverse ? (sort?.value === "asc" ? -1 : 1) : sort?.value === "asc" ? 1 : -1 } }
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

      const tx = await rpc.transactions.getRawTransaction(output.vout.txid, true);
      if (tx === undefined) {
        continue;
      }

      const vout = tx.vout[output.vout.n];
      const utxo: any = {
        _id: output._id.toString(),
        txid: output.vout.txid,
        n: output.vout.n,
        blockHash: output.vout.block.hash,
        blockN: output.vout.block.height,
        scriptPubKey: vout.scriptPubKey,
        value: vout.value,
        sats: btcToSat(vout.value),
      };

      if (vout.scriptPubKey.type === "pubkeyhash") {
        utxo.txhex = tx.hex;
      }

      if (options?.ord !== false) {
        utxo.inscriptions = await db.inscriptions.getInscriptionsByOutpoint(`${output.vout.txid}:${output.vout.n}`);
      }

      utxo.safeToSpend = utxo.inscriptions.length === 0;
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

import { method } from "@valkyr/api";
import Schema, { array, boolean, string } from "computed-types";

import { getOutputCount, getOutputs } from "../../Models/Output";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getPagination, pagination } from "../../Utilities/Pagination";
import { getInscriptionsByOutpoint, getOrdinalsByOutpoint, getSafeToSpendState } from "../../Utilities/Transaction";

export const getUnspents = method({
  params: Schema({
    address: string,
    format: Schema.either("legacy" as const, "next" as const).optional(),
    options: Schema({
      ord: boolean.optional(),
      safetospend: boolean.optional(),
      allowedrarity: array.of(string).optional(),
    }).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ format = "legacy", address, options, pagination }) => {
    const result: any[] = [];

    const height = await rpc.blockchain.getBlockCount();
    const filter = { addresses: address, vin: { $exists: false } };

    const unspents = await getOutputs(filter, getPagination(pagination));
    for (const unspent of unspents) {
      const tx = await rpc.transactions.getRawTransaction(unspent.vout.txid, true);
      if (tx === undefined) {
        continue;
      }

      const vout = tx.vout[unspent.vout.n];
      const utxo: any = {
        txid: unspent.vout.txid,
        n: unspent.vout.n,
        blockHash: unspent.vout.block.hash,
        blockN: unspent.vout.block.height,
        scriptPubKey: vout.scriptPubKey,
        value: vout.value,
        sats: btcToSat(vout.value),
      };

      if (options?.ord !== false) {
        utxo.ordinals = await getOrdinalsByOutpoint(`${unspent.vout.txid}:${unspent.vout.n}`);
        utxo.inscriptions = await getInscriptionsByOutpoint(
          `${unspent.vout.txid}:${unspent.vout.n}`,
          await getMetaFromTxId(unspent.vout.txid)
        );
      }

      utxo.safeToSpend = getSafeToSpendState(
        utxo.ordinals ?? [],
        utxo.inscriptions ?? [],
        options?.allowedrarity ?? ["common", "uncommon"]
      );
      utxo.confirmation = height - unspent.vout.block.height + 1;

      if (options?.safetospend === true && utxo.safeToSpend === false) {
        continue;
      }

      result.push(utxo);
    }

    if (format === "legacy") {
      return result;
    }

    return {
      unspents: result,
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await getOutputCount(filter),
      },
    };
  },
});

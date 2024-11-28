import { BadRequestError, method } from "@valkyr/api";
import Schema, { array, boolean, number, string } from "computed-types";

import { OutputDocument } from "~Database/Output";
import { FindPaginatedParams } from "~Libraries/Paginate";
import { SortDirection } from "~Libraries/Paginate/Types";
import { pagination } from "~Utilities/Pagination";
import { outputHasRunes } from "~Utilities/Runes";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc, ScriptPubKey } from "../../Services/Bitcoin";
import { getSafeToSpendState, ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";

export default method({
  params: Schema({
    address: string,
    value: number.optional(),
    safetospend: boolean.optional(),
    filter: array.of(string).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, value, safetospend = true, filter = [], pagination = {} }) => {
    const spendables: { txid: string; n: number; sats: number; scriptPubKey: ScriptPubKey }[] = [];

    let totalValue = 0;
    let safeToSpend = 0;
    let scanned = 0;

    pagination.limit ??= 100;
    const paginationFilter = { addresses: address, ...noSpentsFilter };
    const sort = { _id: "asc" as SortDirection };

    const paginationParam: FindPaginatedParams<OutputDocument> = {
      ...pagination,
      filter: paginationFilter,
      sort,
    };
    const outputs = await db.outputs.findPaginated(paginationParam);

    if (outputs.documents.length === 0) return { spendables, pagination: outputs.pagination };

    for (const output of outputs.documents) {
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
        confirmation: vout.confirmations
      });

      totalValue += output.value;
      if (value && totalValue >= value) {
        break;
      }
    }

    if (value && totalValue < value) {
      throw new BadRequestError("Insufficient funds", {
        requested: value,
        available: totalValue,
        spendables: {
          scanned,
          safeToSpend: safetospend === true ? safeToSpend : "disabled",
        },
      });
    }

    return { spendables, pagination: outputs.pagination };
  },
});

import { method } from "@valkyr/api";
import Schema, { array, boolean, string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";
import { getExpandedTransaction } from "../../Utilities/Transaction";

const options = Schema({
  ord: boolean.optional(),
  hex: boolean.optional(),
  witness: boolean.optional(),
});

export default method({
  params: Schema({
    txIds: array.of(string),
    options: options.optional(),
  }),
  handler: async ({ txIds, options }) => {
    const expandedTxs = await Promise.allSettled(
      txIds.map(async (txId) => {
        const tx = await rpc.transactions.getRawTransaction(txId, true);
        return getExpandedTransaction(tx, options);
      }),
    );
    // remove the failed promises
    return expandedTxs.filter((tx) => tx.status === "fulfilled").map((tx) => tx.status === "fulfilled" && tx.value);
  },
});

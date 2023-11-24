import { method } from "@valkyr/api";
import Schema, { array, string } from "computed-types";

import { rpc } from "~Services/Bitcoin";

export default method({
  params: Schema({
    ids: array.of(string),
  }),
  handler: async ({ ids }) => {
    const confirmations: Confirmation[] = [];
    for (const id of ids) {
      try{
        const transaction = await rpc.transactions.getRawTransaction(id, true);
        if (!transaction) {
          continue;
        }
        confirmations.push({
          txid: transaction.txid,
          confirmations: transaction.confirmations ?? -1,
          timestamp: transaction.time || transaction.locktime,
        });
      } catch (_) {
        // on transaction not found/error => skip
      }
    }
    return confirmations;
  },
});

type Confirmation = {
  txid: string;
  confirmations: number;
  timestamp: number;
};

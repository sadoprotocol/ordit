import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { RawTransaction, rpc } from "../../Services/Bitcoin";
import { getTransactionAmount, getTransactionFee } from "../../Utilities/Transaction";

export const getLatestTransactions = method({
  params: Schema({
    pagination: Schema({
      block: number.optional(),
      cursor: number.optional(),
    }).optional(),
  }),
  handler: async ({ pagination }) => {
    const transactions: Transaction[] = [];

    let cursor = pagination?.cursor ?? 0;
    let index = 0;

    let blockCount = pagination?.block ?? (await rpc.blockchain.getBlockCount());
    while (transactions.length < 10) {
      const block = await rpc.blockchain.getBlock(blockCount, 2);

      const txs = block.tx.slice(cursor);
      for (const tx of txs) {
        const fee = await getTransactionFee(tx);
        transactions.push({
          txid: tx.txid,
          age: block.time,
          amount: getTransactionAmount(tx),
          fee,
          size: tx.size,
          vsize: tx.vsize,
          block: block.height,
        });
        if (transactions.length === 10) {
          break;
        }
        index += 1;
      }

      if (txs.length <= 10) {
        blockCount -= 1;
        cursor = 0;
        index = 0;
      }
    }

    return {
      transactions,
      pagination: {
        block: blockCount,
        cursor: cursor + index + 1,
      },
    };
  },
});

type Transaction = Pick<RawTransaction, "txid" | "size" | "vsize"> & {
  age: number;
  amount: number;
  fee: number;
  block: number;
};

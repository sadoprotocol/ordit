import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { isCoinbase, RawTransaction, rpc } from "../../Services/Bitcoin";
import { getTransactionAmount, getTransactionFee } from "../../Utilities/Transaction";

export const getTransactions = method({
  params: Schema({
    pagination: Schema({
      block: number.optional(),
      index: number.optional(),
      limit: number.gt(0).lt(20).optional(),
    }).optional(),
  }),
  handler: async ({ pagination }) => {
    const transactions: Transaction[] = [];

    const limit = pagination?.limit ?? 10;
    let cursor = pagination?.index ?? 0;
    let index = 0;

    let blockCount = pagination?.block ?? (await rpc.blockchain.getBlockCount());
    while (transactions.length < limit) {
      const block = await rpc.blockchain.getBlock(blockCount, 2);

      const txs = block.tx.slice(cursor);
      for (const tx of txs) {
        const coinbase = isCoinbase(tx.vin[0]);
        const fee = coinbase === true ? 0 : await getTransactionFee(tx);
        transactions.push({
          txid: tx.txid,
          coinbase,
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
        index: cursor + index + 1,
        limit,
      },
    };
  },
});

type Transaction = Pick<RawTransaction, "txid" | "size" | "vsize"> & {
  coinbase: boolean;
  age: number;
  amount: number;
  fee: number;
  block: number;
};

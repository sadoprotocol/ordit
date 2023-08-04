import { method } from "@valkyr/api";

import { RawTransaction, rpc } from "../../Services/Bitcoin";
import { getTransactionAmount, getTransactionFee } from "../../Utilities/Transaction";

export const getLatestTransactions = method({
  handler: async () => {
    const txs: LatestTransaction[] = [];

    let blockCount = await rpc.blockchain.getBlockCount();
    while (txs.length < 10) {
      const block = await rpc.blockchain.getBlock(blockCount, 2);
      for (const tx of block.tx.reverse()) {
        const fee = await getTransactionFee(tx);
        txs.push({
          txid: tx.txid,
          age: block.time,
          amount: getTransactionAmount(tx),
          fee,
          size: tx.size,
          vsize: tx.vsize,
          block: block.height,
        });
        if (txs.length === 10) {
          break;
        }
      }
      blockCount -= 1;
    }

    return txs;
  },
});

type LatestTransaction = Pick<RawTransaction, "txid" | "size" | "vsize"> & {
  age: number;
  amount: number;
  fee: number;
  block: number;
};

import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";

export const getLatestTransactions = method({
  handler: async () => {
    const txs: any[] = [];

    let blockCount = await rpc.blockchain.getBlockCount();
    while (txs.length < 20) {
      const block = await rpc.blockchain.getBlock(blockCount, 2);
      for (const tx of block.tx.reverse()) {
        txs.push({
          blockHash: block.hash,
          blockHeight: block.height,
          blockTime: block.time,
          ...tx,
        });
      }
      blockCount -= 1;
    }

    return txs;
  },
});

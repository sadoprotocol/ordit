import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";

export const getLatestTransactions = method({
  handler: async () => {
    const blockCount = await rpc.blockchain.getBlockCount();
    const blockHash = await rpc.blockchain.getBlockHash(blockCount);
    const block = await rpc.blockchain.getBlock(blockHash, 2);
    return block.tx
      .reverse()
      .slice(0, 20)
      .map((tx: any) => ({
        block: {
          hash: block.hash,
          height: block.height,
          time: block.time,
        },
        ...tx,
      }));
  },
});

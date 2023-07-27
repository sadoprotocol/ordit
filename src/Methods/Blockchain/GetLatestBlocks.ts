import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const getLatestBlocks = method({
  params: Schema({
    limit: number.lte(20).optional(),
  }),
  handler: async ({ limit = 10 }) => {
    const blockCount = await rpc.blockchain.getBlockCount();
    const blocks = [];
    for (let i = 0; i < limit; i++) {
      const hash = await rpc.blockchain.getBlockHash(blockCount - i);
      const block = await rpc.blockchain.getBlock(hash);
      delete (block as any).tx;
      blocks.push(block);
    }
    return blocks;
  },
});

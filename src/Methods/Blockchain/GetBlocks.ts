import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const getBlocks = method({
  params: Schema({
    limit: number.gt(0).lte(20).optional(),
    from: number.optional(),
  }),
  handler: async ({ limit = 10, from }) => {
    const blocks = [];

    const blockCount = from ? from - 1 : await rpc.blockchain.getBlockCount();
    for (let i = 0; i < limit; i++) {
      const block = await rpc.blockchain.getBlock(blockCount - i);
      delete (block as any).tx;
      blocks.push(block);
    }

    return blocks;
  },
});

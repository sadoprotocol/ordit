import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const getLatestBlocks = method({
  params: Schema({
    limit: number.optional(),
  }),
  handler: async ({ limit = 20 }) => {
    const blockCount = await rpc.blockchain.getBlockCount();
    const blocks = [];
    for (let i = 0; i < limit; i++) {
      const block = await rpc.blockchain.getBlockHash(blockCount - i);
      blocks.push(block);
    }
    return blocks;
  },
});

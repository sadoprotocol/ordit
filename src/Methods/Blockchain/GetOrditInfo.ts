import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";
import { getBlockHeight } from "../../Workers/Indexer/Data";

export const getOrditInfo = method({
  handler: async () => {
    const block = await rpc.blockchain.getBlockchainInfo();
    const indexed = await getBlockHeight();
    return {
      chain: block.chain,
      indexed: `${indexed.toLocaleString()} / ${block.blocks.toLocaleString()} [ ${(
        (indexed / block.blocks) *
        100
      ).toFixed(2)}% ]`,
      blocks: block.blocks,
      headers: block.headers,
    };
  },
});

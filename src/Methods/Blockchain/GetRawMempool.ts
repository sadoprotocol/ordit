import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";

export const getRawMempool = method({
  handler: async () => {
    return rpc.blockchain.getRawMemPool(true);
  },
});

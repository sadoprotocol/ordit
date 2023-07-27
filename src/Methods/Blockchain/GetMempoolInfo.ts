import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";

export const getMempoolInfo = method({
  handler: async () => {
    return rpc.blockchain.getMemPoolInfo();
  },
});

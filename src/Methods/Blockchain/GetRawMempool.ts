import { method } from "@valkyr/api";

import { rpc } from "../../Services/Bitcoin";

export default method({
  handler: async () => {
    return rpc.blockchain.getRawMemPool(true);
  },
});

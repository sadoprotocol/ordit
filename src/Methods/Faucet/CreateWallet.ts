import { method } from "@valkyr/api";

import { Wallet } from "../../Libraries/Wallet";
import { hasFaucetBearer } from "../../Middleware/HasFaucetBearer";

export default method({
  actions: [hasFaucetBearer],
  handler: async () => {
    return Wallet.createSeed();
  },
});

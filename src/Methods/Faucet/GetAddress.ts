import { method } from "@valkyr/api";

import { config } from "../../Config";
import { Wallet } from "../../Libraries/Wallet";
import { hasFaucetBearer } from "../../Middleware/HasFaucetBearer";

export default method({
  actions: [hasFaucetBearer],
  handler: async () => {
    return Wallet.fromSeed(config.faucet.seed).faucet().address;
  },
});

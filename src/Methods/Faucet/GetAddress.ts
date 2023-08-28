import { method } from "@valkyr/api";

import { config } from "../../Config";
import { Wallet } from "../../Libraries/Wallet";

export default method({
  handler: async () => {
    return Wallet.fromSeed(config.faucet.seed).faucet().address;
  },
});

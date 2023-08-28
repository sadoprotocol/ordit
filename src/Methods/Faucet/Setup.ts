import { method } from "@valkyr/api";

import { config } from "../../Config";
import { Wallet } from "../../Libraries/Wallet";
import { rpc } from "../../Services/Bitcoin";

export default method({
  handler: async () => {
    const wallet = Wallet.fromSeed(config.faucet.seed).faucet();
    await rpc.generating.generateToAddress(4949, wallet.address);
  },
});

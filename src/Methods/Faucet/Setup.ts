import { method } from "@valkyr/api";

import { config } from "../../Config";
import { db } from "../../Database";
import { Wallet } from "../../Libraries/Wallet";
import { hasFaucetBearer } from "../../Middleware/HasFaucetBearer";
import { rpc } from "../../Services/Bitcoin";

export default method({
  actions: [hasFaucetBearer],
  handler: async () => {
    const outputCount = await db.outputs.count({});
    if (outputCount >= 4949) {
      return "Setup already done, skipped";
    }
    const wallet = Wallet.fromSeed(config.faucet.seed).faucet();
    await rpc.generating.generateToAddress(4949, wallet.address);
    return "Setup completed";
  },
});

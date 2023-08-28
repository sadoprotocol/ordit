import { method } from "@valkyr/api";

import { Wallet } from "../../Libraries/Wallet";

export default method({
  handler: async () => {
    const seed = await Wallet.createSeed();
    return Wallet.fromSeed(seed).receive(0).address;
  },
});

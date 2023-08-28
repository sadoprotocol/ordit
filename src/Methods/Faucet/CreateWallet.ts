import { method } from "@valkyr/api";

import { Wallet } from "../../Libraries/Wallet";

export default method({
  handler: async () => {
    return Wallet.createSeed();
  },
});

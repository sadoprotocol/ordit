import { method } from "@valkyr/api";

import { resolve } from "../../Workers/Sado/Resolve";

export const parseSadoOrders = method({
  handler: async () => {
    return resolve();
  },
});

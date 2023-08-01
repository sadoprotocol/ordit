import { method } from "@valkyr/api";

import { currency } from "../../Utilities/Currency";

export const getCurrency = method({
  handler: async () => {
    return currency;
  },
});

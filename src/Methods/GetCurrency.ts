import { method } from "@valkyr/api";

import { currency } from "../Utilities/Currency";

export default method({
  handler: async () => {
    return currency;
  },
});

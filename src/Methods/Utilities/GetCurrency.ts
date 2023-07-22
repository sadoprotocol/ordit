import { InternalError, method } from "@valkyr/api";

import { getCurrency as getCurrencyData } from "../../Utilities/Currency";
import { isError } from "../../Utilities/Response";

export const getCurrency = method({
  handler: async () => {
    const currency = await getCurrencyData();
    if (isError(currency)) {
      throw new InternalError(currency.error.message);
    }
    return currency;
  },
});

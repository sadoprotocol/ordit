import { method } from "@valkyr/api";

import { sado } from "../../../Libraries/Sado";

export default method({
  params: sado.order.schema,
  handler: async (order) => {
    return sado.order.toHex(order);
  },
});

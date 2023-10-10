import { method } from "@valkyr/api";

import { toMessageString } from "../../../Database/Sado";
import { sado } from "../../../Libraries/Sado";

export default method({
  params: sado.order.schema,
  handler: async (order) => {
    return toMessageString(order);
  },
});

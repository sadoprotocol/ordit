import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getOrdersByAddress as getSadoOrdersByAddress } from "../../Models/Sado";

export const getOrdersByAddress = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return getSadoOrdersByAddress(address);
  },
});

import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const generateToAddress = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return rpc.generating.generateToAddress(address);
  },
});

import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const sendRawTransaction = method({
  params: Schema({
    hex: string,
    maxFeeRate: number.optional(),
  }),
  handler: async ({ hex, maxFeeRate }) => {
    return rpc.transactions.sendRawTransaction(hex, maxFeeRate);
  },
});

import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const getBlockStats = method({
  params: Schema({
    hashOrHeight: Schema.either(string, number).optional(),
  }),
  handler: async ({ hashOrHeight }) => {
    return rpc.blockchain.getBlockStats(hashOrHeight ?? (await rpc.blockchain.getBlockCount()));
  },
});

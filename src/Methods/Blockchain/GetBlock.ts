import { BadRequestError, method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";

export const getBlock = method({
  params: Schema({
    height: number.optional(),
    hash: string.optional(),
  }),
  handler: async ({ height, hash }) => {
    if (height !== undefined) {
      hash = await rpc.blockchain.getBlockHash(height);
    }
    if (hash === undefined) {
      throw new BadRequestError("Valid height or hash value must be provided.");
    }
    return rpc.blockchain.getBlock(hash, 2);
  },
});

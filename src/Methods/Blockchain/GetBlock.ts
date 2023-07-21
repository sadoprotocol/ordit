import { BadRequestError, method } from "@valkyr/api";
import Schema, { boolean, number, string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";
import { getExpandedTransaction } from "../../Utilities/Transaction";

export const getBlock = method({
  params: Schema({
    height: number.optional(),
    hash: string.optional(),
    verbose: boolean.optional(),
    options: Schema({
      nohex: boolean.optional(),
      nowitness: boolean.optional(),
    }).optional(),
  }),
  handler: async ({ height, hash, verbose, options = {} }) => {
    if (height !== undefined) {
      hash = await rpc.blockchain.getBlockHash(height);
    }

    if (hash === undefined) {
      throw new BadRequestError("Valid height or hash value must be provided.");
    }

    const block = await rpc.blockchain.getBlock(hash, 2);

    if (verbose === true) {
      for (let i = 0, length = block.tx.length; i < length; i++) {
        block.tx[i] = await getExpandedTransaction(block.tx[i], { ...options, noord: true });
      }
    }

    return block;
  },
});

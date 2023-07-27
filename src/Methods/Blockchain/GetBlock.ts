import { BadRequestError, method } from "@valkyr/api";
import Schema, { boolean, number, string } from "computed-types";

import { hasToken } from "../../Actions/HasToken";
import { rpc } from "../../Services/Bitcoin";
import { ExpandedTransaction, getExpandedTransaction } from "../../Utilities/Transaction";

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
  actions: [hasToken],
  handler: async ({ height, hash, verbose, options = {} }) => {
    if (height !== undefined) {
      hash = await rpc.blockchain.getBlockHash(height);
    }

    if (hash === undefined) {
      throw new BadRequestError("Valid height or hash value must be provided.");
    }

    const block = await rpc.blockchain.getBlock(hash, 2);

    const txs: ExpandedTransaction[] = [];
    if (verbose === true) {
      for (let i = 0, length = block.tx.length; i < length; i++) {
        txs[i] = await getExpandedTransaction(block.tx[i], { ...options, ord: false });
      }
    }

    return {
      ...block,
      tx: txs,
    };
  },
});

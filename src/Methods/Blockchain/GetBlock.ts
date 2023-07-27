import { BadRequestError, method } from "@valkyr/api";
import Schema, { boolean, number, string } from "computed-types";

import { RawTransaction, rpc } from "../../Services/Bitcoin";

export const getBlock = method({
  params: Schema({
    height: number.optional(),
    hash: string.optional(),
    verbosity: number.between(1, 2).optional(),
    options: Schema({
      nohex: boolean.optional(),
      nowitness: boolean.optional(),
    }).optional(),
  }),
  handler: async ({ height, hash, verbosity = 1, options = {} }) => {
    if (height !== undefined) {
      hash = await rpc.blockchain.getBlockHash(height);
    }

    if (hash === undefined) {
      throw new BadRequestError("Valid height or hash value must be provided.");
    }

    if (verbosity === 1) {
      return rpc.blockchain.getBlock(hash, 1);
    }

    const txs: RawTransaction[] = [];

    const block = await rpc.blockchain.getBlock(hash, 2);
    if (verbosity === 2) {
      for (const tx of block.tx) {
        if (options.nohex === true) {
          delete (tx as any).hex;
        }
        if (options.nowitness === true) {
          for (const vin of tx.vin) {
            delete (vin as any).txinwitness;
          }
        }
        txs.push(tx);
      }
    }

    return {
      ...block,
      tx: txs,
    };
  },
});

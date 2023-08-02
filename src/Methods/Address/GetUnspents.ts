import { method } from "@valkyr/api";
import Schema, { array, boolean, string, Type } from "computed-types";

import { config } from "../../Config";
import { lookup } from "../../Services/Lookup";
import { sochain } from "../../Services/SoChain";
import { pagination } from "../../Utilities/Pagination";

const options = Schema({
  ord: boolean.optional(),
  safetospend: boolean.optional(),
  allowedrarity: array.of(string).optional(),
});

export const getUnspents = method({
  params: Schema({
    address: string,
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, pagination }) => {
    if (config.chain.network === "mainnet") {
      return sochain.getUnspents(address, options);
    }
    return lookup.getUnspents(address, options, pagination);
  },
});

export type Options = Type<typeof options>;

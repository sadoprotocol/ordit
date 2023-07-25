import { method } from "@valkyr/api";
import Schema, { boolean, string, Type } from "computed-types";

import { lookup } from "../../Services/Lookup";

const options = Schema({
  noord: boolean.optional(),
  nohex: boolean.optional(),
  nowitness: boolean.optional(),
});

export const getTransactions = method({
  params: Schema({
    address: string,
    options: options.optional(),
  }),
  handler: async ({ address, options }) => {
    return lookup.getTransactions(address, options);
  },
});

export type Options = Type<typeof options>;

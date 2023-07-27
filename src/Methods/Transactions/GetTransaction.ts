import { method } from "@valkyr/api";
import Schema, { boolean, string, Type } from "computed-types";

import { rpc } from "../../Services/Bitcoin";
import { getExpandedTransaction } from "../../Utilities/Transaction";

const options = Schema({
  ord: boolean.optional(),
  hex: boolean.optional(),
  witness: boolean.optional(),
});

export const getTransaction = method({
  params: Schema({
    txid: string,
    options: options.optional(),
  }),
  handler: async ({ txid, options }) => {
    const tx = await rpc.transactions.getRawTransaction(txid, true);
    return getExpandedTransaction(tx, options);
  },
});

export type Options = Type<typeof options>;

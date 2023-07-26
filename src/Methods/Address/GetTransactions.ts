import { method } from "@valkyr/api";
import Schema, { boolean, number, string, Type } from "computed-types";

import { TransactionDocument } from "../../Models/Transactions";
import { lookup } from "../../Services/Lookup";

const options = Schema({
  noord: boolean.optional(),
  nohex: boolean.optional(),
  nowitness: boolean.optional(),
});

const pagination = Schema({
  page: number.gt(0).optional(),
  limit: number.max(50).optional(),
});

export const getTransactions = method({
  params: Schema({
    address: string,
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, pagination }) => {
    return {
      transactions: (await lookup.getTransactions(address, options, pagination)).map(format),
      options: {
        noord: options?.noord ?? false,
        nohex: options?.nohex ?? false,
        nowitness: options?.nowitness ?? false,
      },
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        total: await lookup.getTotalTransactions(address),
      },
    };
  },
});

function format(tx: TransactionDocument) {
  return {
    txid: tx.txid,
    blockHash: tx.blockhash,
    blockHeight: tx.blockHeight,
    blockTime: tx.blocktime,
    confirmations: tx.confirmations,
    fee: tx.fee,
    hash: tx.hash,
    hex: tx.hex,
    locktime: tx.locktime,
    size: tx.size,
    vin: tx.vin,
    vout: tx.vout,
    vsize: tx.vsize,
    weight: tx.weight,
  };
}

export type Options = Type<typeof options>;

export type Pagination = Type<typeof pagination>;

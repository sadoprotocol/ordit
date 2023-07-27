import { method } from "@valkyr/api";
import Schema, { boolean, number, string, Type } from "computed-types";

import { hasToken } from "../../Actions/HasToken";
import { TransactionDocument } from "../../Models/Transactions";
import { sochain } from "../../Services/SoChain";

const options = Schema({
  ord: boolean.optional(),
  hex: boolean.optional(),
  witness: boolean.optional(),
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
  actions: [hasToken],
  handler: async ({ address, options, pagination }) => {
    return {
      transactions: (await sochain.getTransactions(address, options, pagination)).map(format),
      options: {
        ord: options?.ord ?? false,
        hex: options?.hex ?? false,
        witness: options?.witness ?? false,
      },
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await sochain.getTotalTransactions(address),
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

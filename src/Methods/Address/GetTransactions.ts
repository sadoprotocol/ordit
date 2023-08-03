import { method } from "@valkyr/api";
import Schema, { boolean, string, Type } from "computed-types";

import { TransactionDocument } from "../../Models/Transactions";
import { lookup } from "../../Services/Lookup";
import { pagination } from "../../Utilities/Pagination";

const options = Schema({
  ord: boolean.optional(),
  hex: boolean.optional(),
  witness: boolean.optional(),
});

export const getTransactions = method({
  params: Schema({
    address: string,
    options: options.optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, options, pagination }) => {
    // if (config.chain.network === "mainnet") {
    //   return {
    //     transactions: (await sochain.getTransactions(address, options, pagination)).map(format),
    //     options: {
    //       ord: options?.ord ?? false,
    //       hex: options?.hex ?? false,
    //       witness: options?.witness ?? false,
    //     },
    //     pagination: {
    //       page: pagination?.page ?? 1,
    //       limit: 10,
    //       total: await sochain.getTotalTransactions(address),
    //     },
    //   };
    // }
    return {
      transactions: (await lookup.getTransactions(address, options, pagination)).map(format),
      options: {
        ord: options?.ord ?? false,
        hex: options?.hex ?? false,
        witness: options?.witness ?? false,
      },
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
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

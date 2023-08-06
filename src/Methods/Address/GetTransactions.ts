import { method } from "@valkyr/api";
import Schema, { boolean, string, Type } from "computed-types";

import { db } from "../../Database";
import { getHeighestOutput } from "../../Database/Output";
import { TransactionDocument } from "../../Database/Transactions";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getPagination, pagination } from "../../Utilities/Pagination";
import { getExpandedTransaction } from "../../Utilities/Transaction";

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
    const outputs = await db.outputs.getByAddress(
      address,
      {},
      { sort: { "vout.block.height": 1, "vin.block.height": 1 }, ...getPagination(pagination) }
    );

    const transactions: any = [];
    for (const output of outputs) {
      const entry = getHeighestOutput(output);
      const tx = await rpc.transactions.getRawTransaction(entry.txid, true);
      if (tx === undefined) {
        continue;
      }
      transactions.push({
        blockHeight: entry.block.height,
        ...(await getExpandedTransaction(tx, options)),
      });
    }

    return {
      transactions: transactions.map(format),
      options: {
        ord: options?.ord ?? false,
        hex: options?.hex ?? false,
        witness: options?.witness ?? false,
      },
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await getTotalTransactions(address),
      },
    };
  },
});

async function getTotalTransactions(address: string): Promise<number> {
  const { total } = await db.outputs.getCountByAddress(address);
  return total;
}

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
    vout: tx.vout.map((vout: any) => {
      vout.sats = btcToSat(vout.value);
      return vout;
    }),
    vsize: tx.vsize,
    weight: tx.weight,
  };
}

export type Options = Type<typeof options>;

export type Pagination = Type<typeof pagination>;

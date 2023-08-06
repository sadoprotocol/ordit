import type { Options as TransactionsOptions } from "../Methods/Address/GetTransactions";
import { getHeighestOutput, getOutputsByAddress, getTransactionCountByAddress } from "../Models/Output";
import { getPagination, Pagination } from "../Utilities/Pagination";
import { getExpandedTransaction } from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

export const lookup = {
  getTotalTransactions,
  getTransactions,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getTotalTransactions(address: string): Promise<number> {
  const { total } = await getTransactionCountByAddress(address);
  return total;
}

async function getTransactions(
  address: string,
  options: TransactionsOptions = {},
  pagination: Pagination = {}
): Promise<any[]> {
  const outputs = await getOutputsByAddress(
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

  return transactions;
}

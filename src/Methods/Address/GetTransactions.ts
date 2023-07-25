import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getVoutsByAddress, VoutDocument } from "../../Models/Vout";
import { rpc } from "../../Services/Bitcoin";
import { ExpandedTransaction, getExpandedTransaction } from "../../Utilities/Transaction";

export const getTransactions = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return getTransactionsByAddress(address);
  },
});

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function getTransactionsByAddress(address: string) {
  const vouts = await getVoutsByAddress(address);
  return getTransactionsFromVouts(vouts);
}

async function getTransactionsFromVouts(vouts: VoutDocument[]) {
  const txIds = vouts.reduce((txIds: string[], vout) => {
    txIds.push(vout.txid);
    if (vout.nextTxid !== undefined) {
      txIds.push(vout.nextTxid);
    }
    return txIds;
  }, []);

  const txs: ExpandedTransaction[] = [];
  for (const txId of txIds) {
    const tx = await rpc.transactions.getRawTransaction(txId, true);
    if (tx !== undefined) {
      txs.push(await getExpandedTransaction(tx));
    }
  }

  return txs;
}

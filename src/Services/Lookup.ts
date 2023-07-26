import { WithId } from "mongodb";

import type { Options as TransactionsOptions, Pagination } from "../Methods/Address/GetTransactions";
import type { Options as UnspentOptions } from "../Methods/Address/GetUnspents";
import {
  addTransaction,
  getAddressesFromTx,
  getTransactionsByAddress,
  TransactionDocument,
  updateVoutById,
} from "../Models/Transactions";
import { getUnspentVouts, getVoutByFilter, getVoutCountByAddress, getVoutsByAddress } from "../Models/Vout";
import {
  getExpandedTransaction,
  getInscriptionsByOutpoint,
  getOrdinalsByOutpoint,
  getSafeToSpendState,
} from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

export const lookup = {
  getTotalTransactions: getVoutCountByAddress,
  getTransactions,
  getUnspents,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getTransactions(
  address: string,
  options: TransactionsOptions = {},
  { limit = 10, page = 1 }: Pagination = {}
) {
  const skip = (page - 1) * limit;
  const transactions = await getTransactionsByAddress(address, {}, { sort: { blockHeight: -1 }, limit, skip });
  if (transactions.length === limit) {
    await checkTransactionsUpdates(transactions);
    return transactions;
  }

  // ### Find
  // Find more potential transactions since the last cache operation if the
  // returned result is less than the limit.

  const txIds = new Set<string>();
  for (const transaction of transactions) {
    txIds.add(transaction.txid);
  }

  const vouts = await getVoutsByAddress(
    address,
    { txid: { $nin: Array.from(txIds) } },
    { sort: { blockN: -1 }, limit, skip }
  );
  for (const vout of vouts) {
    const tx = await rpc.transactions.getRawTransaction(vout.txid, true);
    if (tx === undefined) {
      continue;
    }
    const document: TransactionDocument = {
      addresses: await getAddressesFromTx(tx),
      blockHeight: vout.blockN,
      ...(await getExpandedTransaction(tx, options)),
    };
    const result = await addTransaction(document);
    (document as WithId<TransactionDocument>)._id = result.insertedId;
    transactions.push(document as WithId<TransactionDocument>);
  }

  await checkTransactionsUpdates(transactions);

  return transactions.sort((a, b) => b.blockHeight - a.blockHeight);
}

async function checkTransactionsUpdates(transactions: WithId<TransactionDocument>[]) {
  for (const transaction of transactions) {
    let hasChanges = false;
    for (const vout of transaction.vout) {
      if (vout.spent === false) {
        const currentVout = await getVoutByFilter({ txid: transaction.txid, n: vout.n });
        if (currentVout !== undefined && currentVout.nextTxid !== undefined) {
          hasChanges = true;
          vout.ordinals = [];
          vout.inscriptions = [];
          vout.spent = `${currentVout.nextTxid}:${currentVout.vin}`;
        }
      }
    }
    if (hasChanges) {
      updateVoutById(transaction._id, transaction.vout);
    }
  }
}

/*
const txIds = new Set<string>();
for (const transaction of transactions) {
  txIds.add(transaction.txid);
}

const vouts = await getVoutsByAddress(address, { txid: { $nin: Array.from(txIds) } });
for (const vout of vouts) {
  const tx = await rpc.transactions.getRawTransaction(vout.txid, true);
  if (tx === undefined) {
    continue;
  }
  const document: TransactionDocument = {
    addresses: await getAddressesFromTx(tx),
    blockHeight: vout.blockN,
    ...(await getExpandedTransaction(tx, { noord: true })),
  };
  const result = await collection.insertOne(document);
  (document as WithId<TransactionDocument>)._id = result.insertedId;
  transactions.push(document as WithId<TransactionDocument>);
}

for (const transaction of transactions) {
  let hasChanges = false;
  for (const vout of transaction.vout) {
    if (vout.spent === false) {
      const currentVout = await getVoutByFilter({ txid: transaction.txid, n: vout.n });
      if (currentVout !== undefined && currentVout.nextTxid !== undefined) {
        hasChanges = true;
        vout.spent = `${currentVout.nextTxid}:${currentVout.vin}`;
        vout.ordinals = [];
        vout.inscriptions = [];
      }
    }
  }
  if (hasChanges) {
    collection.updateOne({ _id: transaction._id }, { $set: { vout: transaction.vout } });
  }
}

return transactions.sort((a, b) => b.blockHeight - a.blockHeight);
*/

/*
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
*/

async function getUnspents(
  address: string,
  { noord = false, notsafetospend = false, allowedrarity = ["common", "uncommon"] }: UnspentOptions = {}
) {
  const result = [];

  const blockHeight = await rpc.blockchain.getBlockCount();

  const unspents = await getUnspentVouts(address);
  for (const unspent of unspents) {
    const utxo: any = {
      txid: unspent.txid,
      n: unspent.n,
      blockHash: unspent.blockHash,
      blockN: unspent.blockN,
      scriptPubKey: unspent.scriptPubKey,
      value: unspent.value,
      sats: unspent.sats,
    };

    if (noord === false) {
      utxo.ordinals = await getOrdinalsByOutpoint(`${unspent.txid}:${unspent.n}`);
      utxo.inscriptions = await getInscriptionsByOutpoint(`${unspent.txid}:${unspent.n}`);
    }

    utxo.safeToSpend = getSafeToSpendState(utxo.ordinals ?? [], utxo.inscriptions ?? [], allowedrarity);
    utxo.confirmation = blockHeight - unspent.blockN + 1;

    if (notsafetospend === true && utxo.safeToSpend === false) {
      continue;
    }

    result.push(utxo);
  }

  return result;
}

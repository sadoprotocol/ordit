import type { Options as TransactionsOptions } from "../Methods/Address/GetTransactions";
import type { Options as UnspentOptions } from "../Methods/Address/GetUnspents";
import { getTransactionsByAddress } from "../Models/Transactions";
import { getUnspentVouts } from "../Models/Vout";
import { getInscriptionsByOutpoint, getOrdinalsByOutpoint, getSafeToSpendState } from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

export const lookup = {
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
  { noord = false, nohex = false, nowitness = false }: TransactionsOptions = {}
) {
  const result: any[] = [];

  const transactions = await getTransactionsByAddress(address);
  for (const transaction of transactions) {
    const tx: any = {
      txid: undefined,
      blockHash: undefined,
      blockHeight: undefined,
      blockTime: undefined,
      confirmations: undefined,
      fee: undefined,
      hash: undefined,
      hex: undefined,
      locktime: undefined,
      size: undefined,
      vin: [],
      vout: [],
      vsize: undefined,
      weight: undefined,
    };

    result.push(tx);
  }

  return transactions;
}

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

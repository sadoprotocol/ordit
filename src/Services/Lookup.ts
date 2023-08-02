import type { Options as TransactionsOptions } from "../Methods/Address/GetTransactions";
import type { Options as UnspentOptions } from "../Methods/Address/GetUnspents";
import {
  getHeighestOutput,
  getOutputsByAddress,
  getTransactionCountByAddress,
  getUnspentOutputsByAddress,
} from "../Models/Output";
import { sats } from "../Utilities/Bitcoin";
import { getMetaFromTxId } from "../Utilities/Oip";
import { getPagination, Pagination } from "../Utilities/Pagination";
import {
  getExpandedTransaction,
  getInscriptionsByOutpoint,
  getOrdinalsByOutpoint,
  getSafeToSpendState,
} from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

export const lookup = {
  getTotalTransactions,
  getTransactions,
  getUnspents,
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

async function getUnspents(
  address: string,
  { ord = true, safetospend = false, allowedrarity = ["common", "uncommon"] }: UnspentOptions = {},
  pagination: Pagination = {}
) {
  const result = [];

  const blockHeight = await rpc.blockchain.getBlockCount();

  const unspents = await getUnspentOutputsByAddress(address, getPagination(pagination));
  for (const unspent of unspents) {
    const tx = await rpc.transactions.getRawTransaction(unspent.vout.txid, true);
    if (tx === undefined) {
      continue;
    }

    const vout = tx.vout[unspent.vout.n];
    const utxo: any = {
      txid: unspent.vout.txid,
      n: unspent.vout.n,
      blockHash: unspent.vout.block.hash,
      blockN: unspent.vout.block.height,
      scriptPubKey: vout.scriptPubKey,
      value: vout.value,
      sats: sats(vout.value),
    };

    if (ord === true) {
      utxo.ordinals = await getOrdinalsByOutpoint(`${unspent.vout.txid}:${unspent.vout.n}`);
      utxo.inscriptions = await getInscriptionsByOutpoint(
        `${unspent.vout.txid}:${unspent.vout.n}`,
        await getMetaFromTxId(unspent.vout.txid)
      );
    }

    utxo.safeToSpend = getSafeToSpendState(utxo.ordinals ?? [], utxo.inscriptions ?? [], allowedrarity);
    utxo.confirmation = blockHeight - unspent.vout.block.height + 1;

    if (safetospend === true && utxo.safeToSpend === false) {
      continue;
    }

    result.push(utxo);
  }

  return result.sort((a, b) => a.confirmation - b.confirmation);
}

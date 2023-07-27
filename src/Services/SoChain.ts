import { WithId } from "mongodb";
import fetch from "node-fetch";

import { config } from "../Config";
import type { Options as TransactionsOptions, Pagination } from "../Methods/Address/GetTransactions";
import type { Options } from "../Methods/Address/GetUnspents";
import { addTransaction, getAddressesFromTx, getTransactionsByIds, TransactionDocument } from "../Models/Transactions";
import { sats } from "../Utilities/Bitcoin";
import {
  getExpandedTransaction,
  getInscriptionsByOutpoint,
  getOrdinalsByOutpoint,
  getSafeToSpendState,
} from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";
import { checkTransactionsUpdates } from "./Lookup";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "API-KEY": config.sochain.token,
};

export const sochain = {
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
  const { total } = await get<SochainTransactionCounts>(`/transaction_counts/${config.sochain.network}/${address}`);
  return total;
}

async function getTransactions(address: string, options: TransactionsOptions = {}, { page = 1 }: Pagination = {}) {
  const data = await get<{ transactions: SochainTransaction[] }>(
    `/transactions/${config.sochain.network}/${address}/${page}`
  );
  const txids = data.transactions.map((tx) => tx.hash);

  // ### Transactions

  const transactions = await getTransactionsByIds(txids);
  const missingTxids = txids.filter((txid) => !transactions.find((tx) => tx.txid === txid));

  for (const txid of missingTxids) {
    const tx = await rpc.transactions.getRawTransaction(txid, true);
    if (tx === undefined) {
      continue;
    }
    const document: TransactionDocument = {
      addresses: await getAddressesFromTx(tx),
      blockHeight: data.transactions.find((tx) => tx.hash === txid)?.block ?? -1,
      ...(await getExpandedTransaction(tx, options)),
    };
    const result = await addTransaction(document);
    (document as WithId<TransactionDocument>)._id = result.insertedId;
    transactions.push(document as WithId<TransactionDocument>);
  }

  await checkTransactionsUpdates(transactions);

  return transactions.sort((a, b) => b.blockHeight - a.blockHeight);
}

async function getUnspents(
  address: string,
  { ord = true, safetospend = false, allowedrarity = ["common", "uncommon"] }: Options = {}
) {
  const result: any = [];

  const blockHeight = await rpc.blockchain.getBlockCount();

  const { outputs } = await get<{ outputs: SoChainOutput[] }>(`/unspent_outputs/${config.sochain.network}/${address}`);
  for (const output of outputs) {
    const tx = await rpc.transactions.getRawTransaction(output.hash, true);
    if (tx === undefined) {
      continue;
    }

    const utxo: any = {
      txid: output.hash,
      n: output.index,
      blockHash: tx.blockhash,
      blockN: output.block,
      scriptPubKey: tx.vout[output.index].scriptPubKey,
      value: output.value,
      sats: sats(output.value),
    };

    if (ord === true) {
      const outpoint = `${output.hash}:${output.index}`;
      utxo.ordinals = await getOrdinalsByOutpoint(outpoint);
      utxo.inscriptions = await getInscriptionsByOutpoint(outpoint);
    }

    utxo.safeToSpend = getSafeToSpendState(utxo.ordinals ?? [], utxo.inscriptions ?? [], allowedrarity);
    utxo.confirmation = blockHeight - output.block + 1;

    if (safetospend === true && utxo.safeToSpend === false) {
      continue;
    }

    result.push(utxo);
  }

  return result;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function get<R>(path: string): Promise<R> {
  const response = await fetch(`${config.sochain.url}${path}`, { method: "GET", headers });
  if (response.status === 200) {
    const data = await response.json();
    if (data.status === "fail" && data.data && data.data.error_message) {
      throw new Error("SoChain: " + data.data.error_message);
    }
    return data.data;
  }
  throw new Error("SoChain: " + response.statusText);
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type SochainTransactionCounts = {
  sent: number;
  received: number;
  total: number;
};

type SochainTransaction = {
  hash: string;
  value_sent: string;
  value_recieved: string;
  balance_change: string;
  time: number;
  block: number;
  price: {
    value: string;
    currency: string;
  };
};

type SoChainOutput = {
  hash: string;
  index: number;
  script: string;
  address: string;
  value: string;
  block: number;
  tx_hex: string;
};

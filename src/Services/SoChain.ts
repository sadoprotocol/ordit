import fetch from "node-fetch";

import { config } from "../Config";
import { ExpandedTransaction, getExpandedTransaction } from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "API-KEY": config.sochain.token,
};

export const sochain = {
  getUnspents,
};

async function getUnspents(
  address: string,
  options: any
): Promise<{ unspents: SoChainUnspent[]; txs: Map<string, ExpandedTransaction> }> {
  const { outputs } = await get<{ outputs: SoChainOutput[] }>(`/unspent_outputs/${config.sochain.network}/${address}`);
  const unspents: SoChainUnspent[] = [];
  const txs = new Map<string, ExpandedTransaction>();
  for (const output of outputs) {
    const tx = await rpc.transactions.getRawTransaction(output.hash, true);
    if (tx === undefined) {
      continue;
    }
    txs.set(output.hash, await getExpandedTransaction(tx, options));
    unspents.push({ txid: output.hash, n: output.index });
  }
  return { unspents, txs };
}

type SoChainOutput = {
  hash: string;
  index: number;
  script: string;
  address: string;
  value: number;
  block: number;
  tx_hex: string;
};

type SoChainUnspent = {
  txid: string;
  n: number;
};

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

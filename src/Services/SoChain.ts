import fetch from "node-fetch";

import { config } from "../Config";
import type { Options } from "../Methods/Address/GetUnspents";
import { sats } from "../Utilities/Bitcoin";
import { getInscriptionsByOutpoint, getOrdinalsByOutpoint, getSafeToSpendState } from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "API-KEY": config.sochain.token,
};

export const sochain = {
  getUnspents,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getUnspents(
  address: string,
  { noord = false, notsafetospend = false, allowedrarity = ["common", "uncommon"] }: Options = {}
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
      value: parseInt(output.value),
      sats: sats(parseInt(output.value)),
    };

    if (noord === false) {
      const outpoint = `${output.hash}:${output.index}`;
      utxo.ordinals = await getOrdinalsByOutpoint(outpoint);
      utxo.inscriptions = await getInscriptionsByOutpoint(outpoint);
    }

    utxo.safeToSpend = getSafeToSpendState(utxo.ordinals ?? [], utxo.inscriptions ?? [], allowedrarity);
    utxo.confirmation = blockHeight - output.block + 1;

    if (notsafetospend === true && utxo.safeToSpend === false) {
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

type SoChainOutput = {
  hash: string;
  index: number;
  script: string;
  address: string;
  value: string;
  block: number;
  tx_hex: string;
};

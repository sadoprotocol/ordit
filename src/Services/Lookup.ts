import type { Options } from "../Methods/Address/GetUnspents";
import { getUnspentVouts } from "../Models/Vout";
import { getInscriptionsByOutpoint, getOrdinalsByOutpoint, getSafeToSpendState } from "../Utilities/Transaction";
import { rpc } from "./Bitcoin";

export const lookup = {
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

import { method } from "@valkyr/api";
import Schema, { array, boolean, string } from "computed-types";

import { config } from "../../Config";
import { getUnspentVouts } from "../../Models/Vout";
import { rpc } from "../../Services/Bitcoin";
import { Rarity, RarityOptions } from "../../Services/Ord";
import { sochain } from "../../Services/SoChain";
import { sats } from "../../Utilities/Bitcoin";
import { ExpandedTransaction, ExpandOptions, getExpandedTransaction } from "../../Utilities/Transaction";

export const getUnspents = method({
  params: Schema({
    address: string,
    options: Schema({
      noord: boolean.optional(),
      nohex: boolean.optional(),
      nowitness: boolean.optional(),
      allowedrarity: array.of(string).optional(),
    }).optional(),
  }),
  handler: async ({ address, options }) => {
    return getUnspentsByAddress(address, options);
  },
});

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function getUnspentsByAddress(address: string, options?: ExpandOptions & RarityOptions) {
  const { unspents, txs } =
    config.chain.network === "mainnet"
      ? await sochain.getUnspents(address, options)
      : await getLocalUnspents(address, options);
  return unspents.map((unspent) => {
    const tx = txs.get(unspent.txid);
    const ordinals = tx!.vout.reduce((ordinals: any, vout: any) => ordinals.concat(vout.ordinals), []);
    const inscriptions = tx!.vout.reduce((inscriptions: any, vout: any) => inscriptions.concat(vout.inscriptions), []);
    return {
      n: unspent.n,
      txHash: tx!.hash,
      blockHash: tx!.blockhash,
      blockN: tx!.blockheight,
      sats: sats(tx!.vout[unspent.n].value),
      scriptPubKey: tx!.vout[unspent.n].scriptPubKey,
      txid: tx!.txid,
      value: tx!.vout[unspent.n].value,
      ordinals,
      inscriptions,
      safeToSpent: getSafeToSpendState(ordinals, inscriptions, options?.allowedrarity),
      confirmation: tx!.confirmations,
    };
  });
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getLocalUnspents(address: string, options: any) {
  const unspents = await getUnspentVouts(address);
  const txs = new Map<string, ExpandedTransaction>();
  for (const unspent of unspents) {
    const tx = await rpc.transactions.getRawTransaction(unspent.txid, true);
    if (tx === undefined) {
      continue;
    }
    txs.set(unspent.txid, await getExpandedTransaction(tx, options));
  }
  return { unspents, txs };
}

function getSafeToSpendState(
  ordinals: any[],
  inscriptions: any[],
  allowedRarity: Rarity[] = ["common", "uncommon"]
): boolean {
  if (inscriptions.length > 0 || ordinals.length === 0) {
    return false;
  }
  for (const ordinal of ordinals) {
    if (allowedRarity.includes(ordinal.rarity) === false) {
      return false;
    }
  }
  return true;
}

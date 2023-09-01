import bitcoin, { Transaction } from "bitcoinjs-lib";
import Schema, { boolean, Type } from "computed-types";
import * as ecc from "tiny-secp256k1";

import { db } from "../Database";
import { getBitcoinNetwork, Network } from "../Libraries/Network";
import { isCoinbase, RawTransaction, rpc, Vout } from "../Services/Bitcoin";
import { ord as ordService } from "../Services/Ord";
import { AddressTypes, getAddressessFromVout } from "./Address";

/*
 |--------------------------------------------------------------------------------
 | Schema
 |--------------------------------------------------------------------------------
 */

export const schema = {
  expand: {
    default: Object.freeze({
      ord: false,
      hex: false,
      witness: false,
    }),
    options: Schema({
      ord: boolean.optional(),
      hex: boolean.optional(),
      witness: boolean.optional(),
    }),
  },
} as const;

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

export async function getExpandedTransaction(
  tx: RawTransaction,
  { ord = false, hex = false, witness = false }: ExpandOptions = {}
): Promise<ExpandedTransaction> {
  let fee = 0;
  let coinbase = false;

  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      coinbase = true;
      continue;
    }

    if (witness === false) {
      delete (vin as any).txinwitness;
    }

    const vinTx = await rpc.transactions.getRawTransaction(vin.txid, true);

    (vin as any).value = vinTx.vout[vin.vout].value;
    (vin as any).address = getAddressessFromVout(vinTx.vout[vin.vout])[0];

    fee += vinTx.vout[vin.vout].value;
  }

  for (const vout of tx.vout) {
    const outpoint = `${tx.txid}:${vout.n}`;

    if (ord === true) {
      (vout as any).ordinals = await ordService.getOrdinals(outpoint);
      (vout as any).inscriptions = await db.inscriptions.getInscriptionsByOutpoint(outpoint);
    }

    (vout as any).spent = (await db.outputs.getVinLocation(outpoint)) ?? false;

    fee -= vout.value;
  }

  if (hex === false) {
    delete (tx as any).hex;
  }

  (tx as ExpandedTransaction).fee = coinbase ? 0 : fee;
  (tx as ExpandedTransaction).blockheight = (await rpc.blockchain.getBlockCount()) - tx.confirmations + 1;

  return tx as ExpandedTransaction;
}

export async function getTransactionFee(tx: RawTransaction): Promise<number> {
  let fee = 0;
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    const tx = await rpc.transactions.getRawTransaction(vin.txid, true);
    fee += tx.vout[vin.vout].value;
  }
  for (const vout of tx.vout) {
    fee -= vout.value;
  }
  return fee;
}

export function getTransactionAmount(tx: RawTransaction): number {
  let amount = 0;
  for (const vout of tx.vout) {
    amount += vout.value;
  }
  return amount;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export async function getTransactionOutputHex(txid: string, vout: number): Promise<string | undefined> {
  const transaction = await rpc.transactions.getRawTransaction(txid, true);
  if (transaction === undefined) {
    return undefined;
  }
  const utxo = transaction.vout[vout];
  if (utxo === undefined) {
    return undefined;
  }
  return utxo.scriptPubKey.hex;
}

export function parseLocation(location: string): [string, number] {
  const [txid, vout] = location.split(":");
  if (txid === undefined || vout === undefined) {
    throw new Error(`Failed to parse location ${location}`);
  }
  return [txid, parseInt(vout)];
}

export function decodeRawTransaction(hex: string): Transaction | undefined {
  try {
    return Transaction.fromHex(hex);
  } catch (_) {
    return undefined;
  }
}

export function getNullData(asm: string): string | undefined {
  if (asm.includes("OP_RETURN")) {
    return Buffer.from(asm.replace("OP_RETURN", "").trim(), "hex").toString();
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type ExpandOptions = Type<typeof schema.expand.options>;

export type ExpandVoutsOptions = {
  nooip?: boolean;
  meta?: any;
};

export type ExpandedTransaction = RawTransaction & {
  vout: (Vout & {
    ordinals: any[];
    inscriptions: any[];
    spent: string | false;
  })[];
  fee: number;
  blockheight: number;
};

export function createTransaction(
  key: Buffer,
  type: AddressTypes,
  network: Network | bitcoin.Network,
  paymentOptions?: bitcoin.Payment
) {
  bitcoin.initEccLib(ecc);
  const networkObj = typeof network === "string" ? getBitcoinNetwork() : network;

  if (type === "p2tr") {
    return bitcoin.payments.p2tr({ internalPubkey: key, network: networkObj, ...paymentOptions });
  }

  if (type === "p2sh") {
    return bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: key, network: networkObj }),
      network: networkObj,
    });
  }

  return bitcoin.payments[type]({ pubkey: key, network: networkObj });
}

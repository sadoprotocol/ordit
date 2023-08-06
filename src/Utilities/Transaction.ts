import { Transaction } from "bitcoinjs-lib";
import Schema, { boolean, Type } from "computed-types";

import { config } from "../Config";
import { db } from "../Database";
import { isCoinbase, RawTransaction, rpc, Vout } from "../Services/Bitcoin";
import { ord, Rarity } from "../Services/Ord";
import { getAddressessFromVout } from "./Address";
import { getMetaFromWitness } from "./Oip";

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
  let meta: any = undefined;
  let fee = 0;
  let coinbase = false;

  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      coinbase = true;
      continue;
    }

    if (vin.txinwitness) {
      const oipMeta = await getMetaFromWitness(vin.txinwitness);
      if (oipMeta !== undefined) {
        meta = oipMeta;
      }
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
      (vout as any).ordinals = await getOrdinalsByOutpoint(outpoint);
      (vout as any).inscriptions = await getInscriptionsByOutpoint(outpoint, meta);
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

export async function getOrdinalsByOutpoint(outpoint: string): Promise<any[]> {
  const ordinals = [];

  const satoshis = await ord.list(outpoint);
  for (const satoshi of satoshis) {
    ordinals.push({
      ...(await ord.traits(satoshi.start)),
      ...satoshi,
    });
  }

  return ordinals;
}

export async function getInscriptionsByOutpoint(outpoint: string, meta?: any): Promise<any[]> {
  const inscriptions = [];

  const [txid, n] = outpoint.split(":");
  const tx = await rpc.transactions.getRawTransaction(txid, true);

  const inscriptionIds = await ord.inscriptions(outpoint);
  for (const inscriptionId of inscriptionIds) {
    const inscription = await ord.inscription(inscriptionId);
    inscriptions.push({
      owner: getAddressessFromVout(tx.vout[parseInt(n)])[0],
      ...inscription,
      mediaContent: `${config.api.domain}/content/${inscriptionId}`,
      meta,
    });
  }

  return inscriptions;
}

export function getSafeToSpendState(
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

export function decodeRawTransaction(hex: string): Transaction | undefined {
  try {
    return Transaction.fromHex(hex);
  } catch (_) {
    return undefined;
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

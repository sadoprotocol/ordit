import { config } from "../Config";
import { getSpendingVin } from "../Models/Vout";
import { isCoinbase, RawTransaction, rpc, Vout } from "../Services/Bitcoin";
import { ord } from "../Services/Ord";
import { getAddressFromVout } from "../Workers/Bitcoin/Crawl";
import { getMetaFromWitness } from "./Oip";

export type ExpandedTransaction = RawTransaction & {
  vout: (Vout & {
    ordinals: any[];
    inscriptions: any[];
    spent: string | false;
  })[];
  fee: number;
  blockheight: number;
};

export async function getExpandedTransaction(
  tx: RawTransaction,
  { noord = false, nohex = false, nowitness = false }: Options = {}
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

    if (nowitness === true) {
      delete (vin as any).txinwitness;
    }

    const vinTx = await rpc.transactions.getRawTransaction(vin.txid, true);

    (vin as any).value = vinTx.vout[vin.vout].value;
    (vin as any).address = await getAddressFromVout(vinTx.vout[vin.vout]);

    fee += vinTx.vout[vin.vout].value;
  }

  for (const vout of tx.vout) {
    const outpoint = `${tx.txid}:${vout.n}`;

    if (noord === false) {
      (vout as any).ordinals = await getOrdinals(outpoint);
      (vout as any).inscriptions = await getInscriptions(outpoint, meta);
    }

    (vout as any).spent = (await getSpendingVin(outpoint)) ?? false;

    fee -= vout.value;
  }

  if (nohex === true) {
    delete (tx as any).hex;
  }

  (tx as ExpandedTransaction).fee = coinbase ? 0 : fee;
  (tx as ExpandedTransaction).blockheight = (await rpc.blockchain.getBlockCount()) - tx.confirmations + 1;

  return tx as ExpandedTransaction;
}

async function getOrdinals(outpoint: string): Promise<any[]> {
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

async function getInscriptions(outpoint: string, meta?: any): Promise<any[]> {
  const inscriptions = [];

  const [txid, n] = outpoint.split(":");
  const tx = await rpc.transactions.getRawTransaction(txid, true);

  const inscriptionIds = await ord.inscriptions(outpoint);
  for (const inscriptionId of inscriptionIds) {
    const inscription = await ord.inscription(inscriptionId);
    inscriptions.push({
      id: inscriptionId,
      outpoint,
      owner: await getAddressFromVout(tx.vout[parseInt(n)]),
      ...inscription,
      mediaContent: `${config.api.domain}/content/${inscriptionId}`,
      meta,
    });
  }

  return inscriptions;
}

export type Options = {
  noord?: boolean;
  nohex?: boolean;
  nowitness?: boolean;
};

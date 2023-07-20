import { FastifyRequest } from "fastify";

import { config } from "../../Config";
import { fastify } from "../../Fastify";
import { isCoinbase, RawTransaction, rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { getMetaFromWitness } from "../../Utilities/Oip";
import { getAddressFromVout } from "../../Workers/Bitcoin/Crawl";

type Request = FastifyRequest<{
  Body: {
    txid: string;
    options?: Options;
  };
}>;

type Options = {
  noord?: boolean;
  nohex?: boolean;
  nowitness?: boolean;
};

fastify.post(
  "/utxo/transaction",
  {
    schema: {
      body: {
        txid: { type: "string" },
        options: {
          type: "object",
          properties: {
            noord: { type: "boolean", default: false },
            nohex: { type: "boolean", default: false },
            nowitness: { type: "boolean", default: false },
          },
        },
      },
    },
  },
  async (req: Request) => {
    const tx = await rpc.transactions.getRawTransaction(req.body.txid, true);
    return {
      success: true,
      message: "Transaction of " + req.body.txid,
      rdata: await getExpandedTransaction(tx, req.body.options),
    };
  }
);

async function getExpandedTransaction(tx: RawTransaction, options: Options = {}): Promise<any> {
  let meta: any = undefined;
  let fee = 0;

  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }

    if (vin.txinwitness) {
      const oipMeta = await getMetaFromWitness(vin.txinwitness);
      if (oipMeta !== undefined) {
        meta = oipMeta;
      }
    }

    if (options.nowitness === true) {
      delete (vin as any).txinwitness;
    }

    const vinTx = await rpc.transactions.getRawTransaction(vin.txid, true);

    (vin as any).value = vinTx.vout[vin.vout].value;
    (vin as any).address = await getAddressFromVout(vinTx.vout[vin.vout]);

    fee += vinTx.vout[vin.vout].value;
  }

  for (const vout of tx.vout) {
    const outpoint = `${tx.txid}:${vout.n}`;

    if (options.noord === false) {
      (vout as any).ordinals = await getOrdinals(outpoint);
      (vout as any).inscriptions = await getInscriptions(outpoint, meta);
    }

    const txout = await rpc.blockchain.getTxOut(tx.txid, vout.n, false);
    if (txout !== null) {
      (vout as any).unspent = {
        bestblock: txout.bestblock,
        confirmations: txout.confirmations,
        coinbase: txout.coinbase,
      };
      (vout as any).spent = false;
    } else {
      (vout as any).spent = true;
    }

    fee -= vout.value;
  }

  if (options.nohex === true) {
    delete (tx as any).hex;
  }

  (tx as any).fee = fee;
  (tx as any).blockheight = (await rpc.blockchain.getBlockCount()) - tx.confirmations + 1;

  return tx;
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

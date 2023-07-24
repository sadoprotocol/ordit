import { FastifyRequest } from "fastify";

import { config } from "../../Config";
import { fastify } from "../../Fastify";
import { getUnspentVouts } from "../../Models/Vout";
import { rpc } from "../../Services/Bitcoin";
import { Rarity } from "../../Services/Ord";
import { sochain } from "../../Services/SoChain";
import { sats } from "../../Utilities/Bitcoin";
import { ExpandedTransaction, getExpandedTransaction } from "../../Utilities/Transaction";

type Request = FastifyRequest<{
  Body: {
    address: string;
    options?: Options;
  };
}>;

type Options = {
  noord?: boolean;
  notsafetospend?: boolean;
  allowedrarity?: Rarity[];
  txhex?: boolean;
  oips?: boolean;
};

fastify.post(
  "/utxo/unspents",
  {
    schema: {
      body: {
        address: { type: "string" },
        options: {
          type: "object",
          properties: {
            noord: { type: "boolean", default: false },
            notsafetospend: { type: "boolean", default: false },
            allowedrarity: {
              type: "array",
              enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
              default: ["common", "uncommon"],
            },
            txhex: { type: "boolean", default: false },
            oips: { type: "boolean", default: false },
          },
        },
      },
    },
  },
  async (req: Request) => {
    const { unspents, txs } =
      config.chain.network === "mainnet"
        ? await sochain.getUnspents(req.body.address, req.body.options)
        : await getUnspents(req.body.address, req.body.options);
    return {
      success: true,
      message: "Unspents of " + req.body.address,
      rdata: unspents.map((unspent) => {
        const tx = txs.get(unspent.txid);
        const ordinals = tx!.vout.reduce((ordinals: any, vout: any) => ordinals.concat(vout.ordinals), []);
        const inscriptions = tx!.vout.reduce(
          (inscriptions: any, vout: any) => inscriptions.concat(vout.inscriptions),
          []
        );
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
          safeToSpent: getSafeToSpendState(ordinals, inscriptions, req.body.options?.allowedrarity),
          confirmation: tx!.confirmations,
        };
      }),
    };
  }
);

async function getUnspents(address: string, options: any) {
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
  inscriptions: [],
  allowedRarity: Rarity[] = ["common", "uncommon"]
): boolean {
  if (inscriptions.length > 0) {
    return false;
  }
  for (const ordinal of ordinals) {
    if (allowedRarity.includes(ordinal.rarity) === false) {
      return false;
    }
  }
  return true;
}

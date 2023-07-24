import { FastifyRequest } from "fastify";

import { fastify } from "../Fastify";
import { getVoutsByAddress, VoutDocument } from "../Models/Vout";
import { rpc } from "../Services/Bitcoin";
import { ExpandedTransaction, getExpandedTransaction } from "../Utilities/Transaction";

type Request = FastifyRequest<{
  Body: {
    address: string;
  };
}>;

fastify.post(
  "/utxo/transactions",
  {
    schema: {
      body: {
        address: { type: "string" },
      },
    },
  },
  async (req: Request) => {
    const vouts = await getVoutsByAddress(req.body.address);
    return {
      success: true,
      message: "Transactions of " + req.body.address,
      rdata: await getTransactionsFromVouts(vouts).catch((err) => {
        console.log(err);
        return err;
      }),
    };
  }
);

async function getTransactionsFromVouts(vouts: VoutDocument[]) {
  const txIds = vouts.reduce((txIds: string[], vout) => {
    txIds.push(vout.txid);
    if (vout.nextTxid !== undefined) {
      txIds.push(vout.nextTxid);
    }
    return txIds;
  }, []);

  const txs: ExpandedTransaction[] = [];
  for (const txId of txIds) {
    const tx = await rpc.transactions.getRawTransaction(txId, true);
    if (tx !== undefined) {
      txs.push(await getExpandedTransaction(tx));
    }
  }

  return txs;
}

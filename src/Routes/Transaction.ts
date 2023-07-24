import { FastifyRequest } from "fastify";

import { fastify } from "../Fastify";
import { rpc } from "../Services/Bitcoin";
import { getExpandedTransaction } from "../Utilities/Transaction";

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

import { FastifyRequest } from "fastify";

import { fastify } from "../../Fastify";
import { ord } from "../../Services/Ord";
import { getMetaFromTxId } from "../../Utilities/Oip";

type Request = FastifyRequest<{
  Params: {
    outpoint: string;
  };
}>;

fastify.get(
  "/utxo/inscriptions/:outpoint",
  {
    schema: {
      params: {
        outpoint: { type: "string" },
      },
    },
  },
  async (req: Request) => {
    const data = [];

    const inscriptionIds = await ord.inscriptions(req.params.outpoint);
    for (const id of inscriptionIds) {
      const inscription = await ord.inscription(id);
      const [txid] = req.params.outpoint.split(":");
      const oipMeta = await getMetaFromTxId(txid);
      if (oipMeta !== undefined) {
        inscription.oipMeta = oipMeta;
      }
      data.push(inscription);
    }

    return {
      success: true,
      message: "Inscriptions for outpoint " + req.params.outpoint,
      rdata: data,
    };
  }
);

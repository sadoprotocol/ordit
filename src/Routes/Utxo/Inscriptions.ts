import { FastifyRequest } from "fastify";

import { fastify } from "../../Fastify";
import { isCoinbase, rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";

fastify.get(
  "/inscriptions/:outpoint",
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
      const oipMeta = await getOip01meta(txid);
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

async function getOip01meta(txid: string): Promise<any> {
  const tx = await rpc.transactions.getRawTransaction(txid, true);
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }

    // ### OIP Witness
    // Check if the witness contains hash for application/json;charset=utf-8
    // hash 6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38

    const oipMeta = vin.txinwitness.find((witnessItem) =>
      witnessItem.includes("6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38")
    );

    if (oipMeta === undefined) {
      return undefined;
    }

    const decodedScript = await rpc.transactions.decodeScript(oipMeta);
    if (decodedScript === undefined) {
      return undefined;
    }

    const splits = decodedScript.asm.split(" ");
    const splitIndex = splits.findIndex(
      (item) => item === "6170706c69636174696f6e2f6a736f6e3b636861727365743d7574662d38"
    );

    let buildString = "";
    let lookIndex = splitIndex + 2;

    while (lookIndex !== -1) {
      const val = splits[lookIndex];

      if (val === undefined || val === "0" || val.includes("OP")) {
        lookIndex = -1;
      } else {
        buildString += splits[lookIndex];
        lookIndex += 1;
      }

      if (buildString.trim() !== "") {
        try {
          return JSON.parse(Buffer.from(buildString, "hex").toString("utf8"));
        } catch (err) {
          return undefined;
        }
      }
    }
  }
  return undefined;
}

type Request = FastifyRequest<{
  Params: {
    outpoint: string;
  };
}>;

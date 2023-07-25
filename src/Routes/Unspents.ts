import { FastifyRequest } from "fastify";

import { config } from "../Config";
import { fastify } from "../Fastify";
import { Options } from "../Methods/Address/GetUnspents";
import { lookup } from "../Services/Lookup";
import { sochain } from "../Services/SoChain";

type Request = FastifyRequest<{
  Body: {
    address: string;
    options?: Options;
  };
}>;

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
          },
        },
      },
    },
  },
  async (req: Request) => {
    if (config.chain.network === "mainnet") {
      return sochain.getUnspents(req.body.address, req.body.options);
    }
    return lookup.getUnspents(req.body.address, req.body.options);
  }
);

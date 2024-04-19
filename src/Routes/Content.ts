import { FastifyRequest } from "fastify";

import { db } from "../Database";
import { fastify } from "../Fastify";

type MediaRequest = FastifyRequest<{
  Params: {
    inscription: string;
  };
}>;

type SatIndexRequest = FastifyRequest<{
  Params: {
    satNumber: number;
    index: number;
  };
}>;

fastify.get(
  "/content/:inscription",
  {
    schema: {
      params: {
        inscription: { type: "string" },
      },
    },
  },
  async (request: MediaRequest, reply) => {
    const media = await db.media.getByInscriptionId(request.params.inscription);
    const buffer = Buffer.from(media.content, "base64");
    const rep = reply
      .code(200)
      .header("X-Frame-Options", "ALLOWALL")
      .header("Access-Control-Allow-Origin", "*")
      .header("Cross-Origin-Resource-Policy", "cross-origin")
      .header("Content-Security-Policy", "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob:")
      .header(
        "Content-Security-Policy",
        "default-src 'self' *:*/content/ *:*/blockheight *:*/blockhash *:*/blockhash/ *:*/blocktime 'unsafe-eval' 'unsafe-inline' data: blob:",
      )
      .header("Content-Type", media.type)
      .header("Content-Length", buffer.length);
    if (media.encoding) {
      rep.header("Content-Encoding", media.encoding);
    }

    rep.send(buffer);
  },
);

fastify.get(
  "/r/sat/:satNumber/at/:index",
  {
    schema: {
      params: {
        satNumber: { type: "number" },
        index: { type: "number" },
      },
    },
  },
  async (request: SatIndexRequest, reply) => {
    const isNegative = request.params.index < 0;
    const inscriptions = await db.inscriptions.find({ sat: request.params.satNumber }, { sort: { id: isNegative ? -1 : 1 }});
    const inscription = inscriptions[isNegative ? Math.abs(request.params.index) - 1 : request.params.index];

    const rep = reply
      .code(200)
      .header("X-Frame-Options", "ALLOWALL")
      .header("Access-Control-Allow-Origin", "*")
      .header("Cross-Origin-Resource-Policy", "cross-origin")
      .header("Content-Security-Policy", "default-src 'self' 'unsafe-eval' 'unsafe-inline' data: blob:")
      .header(
        "Content-Security-Policy",
        "default-src 'self' *:*/content/ *:*/blockheight *:*/blockhash *:*/blockhash/ *:*/blocktime 'unsafe-eval' 'unsafe-inline' data: blob:",
      );

    rep.send({
      id: inscription.id
    });
  },
);
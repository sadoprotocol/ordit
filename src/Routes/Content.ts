import { FastifyRequest } from "fastify";

import { db } from "../Database";
import { fastify } from "../Fastify";

type MediaRequest = FastifyRequest<{
  Params: {
    inscription: string;
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
        "default-src *:*/content/ *:*/blockheight *:*/blockhash *:*/blockhash/ *:*/blocktime 'unsafe-eval' 'unsafe-inline' data: blob:",
      )
      .header("Content-Type", media.type)
      .header("Content-Length", buffer.length);
    if (media.encoding) {
      rep.header("Content-Encoding", media.encoding);
    }

    rep.send(buffer);
  },
);

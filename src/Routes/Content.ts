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
    reply
      .code(200)
      .header("X-Frame-Options", "ALLOWALL")
      .header("Content-Type", media.type)
      .header("Content-Length", buffer.length)
      .send(buffer);
  }
);

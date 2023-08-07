import { FastifyRequest } from "fastify";

import { fastify } from "../Fastify";
import { rpc } from "../Services/Bitcoin";

fastify.get("/blockheight", async () => {
  return rpc.blockchain.getBlockCount();
});

fastify.get("/blockhash", async () => {
  return rpc.blockchain.getLatestBlock().then((block) => block.hash);
});

fastify.get("/blocktime", async () => {
  return rpc.blockchain.getLatestBlock().then((block) => block.time);
});

fastify.get(
  "/blockhash/:height",
  {
    schema: {
      params: {
        height: { type: "number" },
      },
    },
  },
  async (request: BlockHashByHeight) => {
    console.log(request.query);
    return rpc.blockchain.getBlockHash(request.params.height);
  }
);

type BlockHashByHeight = FastifyRequest<{
  Params: {
    height: number;
  };
}>;

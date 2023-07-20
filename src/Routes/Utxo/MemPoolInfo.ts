import { fastify } from "../../Fastify";
import { rpc } from "../../Services/Bitcoin";

fastify.get("/utxo/mempool_info", async () => {
  return {
    success: true,
    message: "Information of the current mempool activity",
    rdata: await rpc.blockchain.getMemPoolInfo(),
  };
});

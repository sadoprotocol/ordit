import { fastify } from "../Fastify";
import { rpc } from "../Services/Bitcoin";

fastify.get("/utxo/unconfirmed_transactions", async () => {
  return {
    success: true,
    message: "Unconfirmed Transactions",
    rdata: rpc.blockchain.getRawMemPool(true),
  };
});

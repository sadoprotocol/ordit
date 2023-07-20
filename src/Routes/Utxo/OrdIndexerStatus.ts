import { fastify } from "../../Fastify";
import { ord } from "../../Services/Ord";

fastify.get("/utxo/ord_indexer_status", async () => {
  return {
    success: true,
    message: "Status of each ord indexer",
    rdata: await ord.status(),
  };
});

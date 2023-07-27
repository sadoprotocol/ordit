import { fastify } from "../Fastify";

fastify.get("/health", async () => {
  return {
    status: "ok",
  };
});

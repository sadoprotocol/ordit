import { fastify } from "../Fastify";

fastify.get("/", async () => {
  return {
    success: true,
    message: "Invalid requests",
    rdata: null,
  };
});

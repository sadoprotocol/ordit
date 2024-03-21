import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

import { api } from "./Api";

export const fastify = Fastify();
fastify.addHook('onRequest', async (request, reply) => {
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
});

fastify.register(cors);
fastify.register(helmet);
fastify.register(api.fastify);

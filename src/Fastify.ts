import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

export const fastify = Fastify();

fastify.register(cors);
fastify.register(helmet);

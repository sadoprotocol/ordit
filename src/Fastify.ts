import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

import { api } from "./Api";

export const fastify = Fastify();

fastify.register(cors);
fastify.register(helmet);
fastify.register(api.fastify);

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import debug from "debug";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { index } from "./Index";

const log = debug("ordit-worker");

const fastify = Fastify();

fastify.register(cors);
fastify.register(helmet);

fastify.get("/health", async () => true);

/*
 |--------------------------------------------------------------------------------
 | Bitcoin
 |--------------------------------------------------------------------------------
 |
 | Listens for new blocks coming in from the blockhain node and triggers indexing
 | of the outputs and ordinals via ord service.
 |
 */

fastify.get("/hooks/bitcoin", async () => {
  await index();
});

/*
 |--------------------------------------------------------------------------------
 | Ordinals
 |--------------------------------------------------------------------------------
 |
 | Hook listening for events sent from https://github.com/hirosystems/ordhook
 | service. This service actively scans for changes to the bitcoin chain and
 | emits events for ordinal and inscriptions changes.
 |
 */

fastify.post("/hooks/ord", async (req) => {
  console.log("hord", req.body);
});

/*
 |--------------------------------------------------------------------------------
 | Start Watcher
 |--------------------------------------------------------------------------------
 */

const start = async () => {
  await bootstrap();
  await fastify
    .listen({ host: config.parser.host, port: config.parser.port })
    .then((address) => {
      log(`listening on ${address}`);
    })
    .catch((err) => {
      log(err);
      process.exit(1);
    });
};

start();

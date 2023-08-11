import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import debug from "debug";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { index } from "./Index";

const log = debug("ordit-worker");

const fastify = Fastify();

const health = {
  redundancyCount: 0,
};

let timeout: NodeJS.Timeout | undefined;

fastify.register(cors);
fastify.register(helmet);

fastify.get("/health", async () => health);

/*
 |--------------------------------------------------------------------------------
 | Bitcoin
 |--------------------------------------------------------------------------------
 |
 | Listens for new blocks coming in from the blockhain node and triggers indexing
 | of the outputs and ordinals via ord service.
 |
 */

fastify.get("/hooks/bitcoin", () => {
  health.redundancyCount = 0;
  clearTimeout(timeout);
  index().finally(startRedundancyRunner);
});

/*
 |--------------------------------------------------------------------------------
 | Redundancy
 |--------------------------------------------------------------------------------
 |
 | Trigger a manual index run after X minutes to ensure that the indexer is
 | catching up in case of the blockchain failing to inform the watcher of new
 | blocks.
 |
 | Should inform of potential issues via the health endpoint.
 |
 */

async function startRedundancyRunner() {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    health.redundancyCount += 1;
    index().finally(startRedundancyRunner);
  }, 1000 * 60 * 10);
}

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

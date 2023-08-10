import "./Methods";
import "./Routes";

import debug from "debug";

import { bootstrap } from "./Bootstrap";
import { config } from "./Config";
import { fastify } from "./Fastify";
import { startCurrencyTracker } from "./Utilities/Currency";

const log = debug("ordit-fastify");

const start = async () => {
  await bootstrap();
  await startCurrencyTracker();
  await fastify
    .listen({ host: "0.0.0.0", port: config.api.port })
    .then((address) => {
      log(`listening on ${address}`);
    })
    .catch((err) => {
      log(err);
      process.exit(1);
    });
};

start();

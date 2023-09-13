import "./Routes";

import { registerMethods } from "./Api";
import { bootstrap } from "./Bootstrap";
import { config } from "./Config";
import { fastify } from "./Fastify";
import { startCurrencyTracker } from "./Utilities/Currency";
import { log } from "./Workers/Log";

const start = async () => {
  await bootstrap();
  await registerMethods();
  await startCurrencyTracker();
  await fastify
    .listen({ host: "0.0.0.0", port: config.api.port })
    .then((address) => {
      log(`\n👂 listening on ${address}\n`);
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
};

start();

import "./Routes";

import { registerMethods } from "./Api";
import { bootstrap } from "./Bootstrap";
import { config } from "./Config";
import { fastify } from "./Fastify";
import { log } from "./Libraries/Log";
import { startCurrencyTracker } from "./Utilities/Currency";

const start = async () => {
  await bootstrap();
  await registerMethods();
  await startCurrencyTracker();
  await fastify
    .listen({ host: config.api.host, port: config.api.port })
    .then((address) => {
      log(`\n👂 listening on ${address}\n`);
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
};

start();

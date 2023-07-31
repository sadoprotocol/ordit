import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import debug from "debug";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { getHeighestBlock } from "../Models/Output";
import { rpc } from "../Services/Bitcoin";
import { crawl as crawlBlock } from "./Bitcoin/Outputs/Output";
import { spend } from "./Bitcoin/Outputs/Spend";
import { crawl as crawlOrdinals } from "./Ord/Crawl";

const log = debug("ordit-worker");

const fastify = Fastify();

fastify.register(cors);
fastify.register(helmet);

let indexing = false;

fastify.get("/health", async () => true);

fastify.all("/", async (req: any) => {
  if (indexing === true) {
    return;
  }
  indexing = true;

  log("received new block %s", req.query.block);

  const currentBlockHeight = await rpc.blockchain.getBlockCount();

  if (config.parser.enabled === true) {
    await indexUtxos(currentBlockHeight);
  }

  if (config.ord.enabled === true) {
    await indexOrdinals();
  }

  log("indexed to block %d", currentBlockHeight);

  indexing = false;
});

async function indexUtxos(currentBlockHeight: number): Promise<void> {
  let crawlerBlockHeight = await getHeighestBlock();
  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawlBlock(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
  await spend();
}

async function indexOrdinals(): Promise<void> {
  await crawlOrdinals();
}

const start = async () => {
  await bootstrap();
  await fastify
    .listen({ host: "0.0.0.0", port: config.parser.port })
    .then((address) => {
      log(`listening on ${address}`);
    })
    .catch((err) => {
      log(err);
      process.exit(1);
    });
};

start();

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
import { parse } from "./Sado/Parse";

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

let indexing = false;

fastify.get("/hooks/bitcoin", async (req: any) => {
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
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function indexUtxos(currentBlockHeight: number): Promise<void> {
  let crawlerBlockHeight = await getHeighestBlock();
  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawlBlock(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
  await spend();
  await parse();
}

async function indexOrdinals(): Promise<void> {
  await crawlOrdinals();
}

/*
 |--------------------------------------------------------------------------------
 | Start Watcher
 |--------------------------------------------------------------------------------
 */

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

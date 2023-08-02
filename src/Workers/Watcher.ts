import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import debug from "debug";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { deleteOutputsAfterHeight, getHeighestBlock as getHeighestOutputBlock, getOutput } from "../Models/Output";
import { deleteSadoAfterHeight } from "../Models/Sado";
import { deleteSadoOrdersAfterHeight, getHeighestBlock as getHeighestSadoBlock } from "../Models/SadoOrders";
import { rpc } from "../Services/Bitcoin";
import { crawl as crawlBlock } from "./Bitcoin/Outputs/Output";
import { spend } from "./Bitcoin/Outputs/Spend";
import { crawl as crawlOrdinals } from "./Ord/Crawl";
import { parse, parseBlock } from "./Sado/Parse";

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
  const lastOutputHeight = await getHeighestOutputBlock();
  const reorgHeight = await getReorgHeight(0, lastOutputHeight);

  // ### Parse

  if (config.parser.enabled === true) {
    await indexUtxos(currentBlockHeight, reorgHeight);
  }

  if (config.sado.enabled === true) {
    await indexSado(currentBlockHeight, reorgHeight);
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

async function indexUtxos(currentBlockHeight: number, reorgHeight: number): Promise<void> {
  let crawlerBlockHeight = await getHeighestOutputBlock();
  if (reorgHeight !== crawlerBlockHeight) {
    log("Reorg detected, rolling back to block %d from %d", reorgHeight, crawlerBlockHeight);
    await deleteOutputsAfterHeight(reorgHeight);
    crawlerBlockHeight = reorgHeight;
  }
  while (crawlerBlockHeight <= currentBlockHeight) {
    await crawlBlock(crawlerBlockHeight, currentBlockHeight);
    crawlerBlockHeight += 1;
  }
  await spend();
}

async function indexSado(currentBlockHeight: number, reorgHeight: number): Promise<void> {
  let crawlerBlockHeight = await getHeighestSadoBlock();
  if (reorgHeight !== crawlerBlockHeight) {
    log("Reorg detected, rolling back to block %d from %d", reorgHeight, crawlerBlockHeight);
    await deleteSadoAfterHeight(reorgHeight);
    await deleteSadoOrdersAfterHeight(reorgHeight);
    crawlerBlockHeight = reorgHeight;
  }
  while (crawlerBlockHeight <= currentBlockHeight) {
    const hash = await rpc.blockchain.getBlockHash(crawlerBlockHeight);
    const block = await rpc.blockchain.getBlock(hash, 2);
    await parseBlock(block);
    crawlerBlockHeight += 1;
  }
  await parse();
}

async function indexOrdinals(): Promise<void> {
  await crawlOrdinals();
}

async function getReorgHeight(start: number, end: number): Promise<number> {
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    const blockHash = await rpc.blockchain.getBlockHash(mid);
    const output = await getOutput({ "vout.block.height": mid });
    if (output === undefined || output.vout.block.hash !== blockHash) {
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }
  return end;
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

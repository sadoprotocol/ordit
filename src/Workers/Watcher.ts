import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import debug from "debug";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { deleteOutputsAfterHeight, getHeighestBlock as getHeighestOutputBlock, getOutput } from "../Models/Output";
import { deleteSadoAfterHeight } from "../Models/Sado";
import { getHeighestBlock as getHeighestSadoBlock } from "../Models/Sado";
import { deleteSadoOrdersAfterHeight } from "../Models/SadoOrders";
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

  const blockHeight = await rpc.blockchain.getBlockCount();
  const reorgHeight = await getReorgHeight(0, blockHeight);

  // ### Parse

  if (config.parser.enabled === true) {
    log("indexing outputs");
    await indexUtxos(blockHeight, reorgHeight);
  }

  if (config.sado.enabled === true) {
    log("indexing sado");
    await indexSado(blockHeight, reorgHeight);
  }

  if (config.ord.enabled === true) {
    log("indexing ordinals");
    await indexOrdinals();
  }

  log("indexed to block %d", blockHeight);

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

async function indexUtxos(blockHeight: number, reorgHeight: number): Promise<void> {
  let outputBlockHeight = await getHeighestOutputBlock();

  // ### Reorg Check
  // Check if the last output block mined is newer than the reorg height. If so,
  // we need to roll back the outputs to the reorg height and parse from that
  // point forward.

  if (reorgHeight < outputBlockHeight) {
    log("Reorg detected, rolling back outputs to block %d", reorgHeight);
    await deleteOutputsAfterHeight(reorgHeight);
    outputBlockHeight = reorgHeight;
  }

  // ### Crawl
  // Crawl all blocks up until current block height.

  while (outputBlockHeight <= blockHeight) {
    await crawlBlock(outputBlockHeight, blockHeight);
    outputBlockHeight += 1;
    log("parsed output block %d", outputBlockHeight);
  }
  await spend();
}

async function indexSado(blockHeight: number, reorgHeight: number): Promise<void> {
  let sadoBlockHeight = await getHeighestSadoBlock();

  // ### Reorg Check
  // Check if the last sado block mined is newer than the reorg height. If so,
  // we need to roll back the sado and sado orders to the reorg height and parse
  // from that point forward.

  if (reorgHeight < sadoBlockHeight) {
    log("Reorg detected, rolling back sado to block %d", reorgHeight);
    await deleteSadoAfterHeight(reorgHeight);
    await deleteSadoOrdersAfterHeight(reorgHeight);
    sadoBlockHeight = reorgHeight;
  }

  // ### Parse
  // Parse all sado blocks up until current block height.

  while (sadoBlockHeight <= blockHeight) {
    const hash = await rpc.blockchain.getBlockHash(sadoBlockHeight);
    const block = await rpc.blockchain.getBlock(hash, 2);
    await parseBlock(block);
    sadoBlockHeight += 1;
    log("parsed sado block %d", sadoBlockHeight);
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

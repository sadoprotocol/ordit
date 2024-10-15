import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";

import { bootstrap } from "../Bootstrap";
import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { ord } from "../Services/Ord";
import { index } from "./Index";

const fastify = Fastify();

let indexing = false;

let lastHeight = 0;

let timeout: NodeJS.Timeout | undefined;

fastify.register(cors);
fastify.register(helmet);

/*
 |--------------------------------------------------------------------------------
 | Health
 |--------------------------------------------------------------------------------
 |
 | Provides health information for the worker services.
 |
 */

fastify.get("/health", async () => {
  const info = await rpc.blockchain.getBlockchainInfo();
  const orditHeight = await db.indexer.getHeight();
  const ordHeight = await ord.getHeight();
  return {
    chain: info.chain,
    status: getWorkerStatus(),
    synced: [orditHeight, ordHeight].every((height) => height === info.blocks),
    indexes: {
      blockchain: info.blocks,
      ordit: orditHeight,
      ord: ordHeight,
    },
  };
});

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
  startIndexer();
  return "done";
});

/*
 |--------------------------------------------------------------------------------
 | Redundancy
 |--------------------------------------------------------------------------------
 |
 | If the blockchain is not sending updates for new blocks over the network we
 | run a secondary reundancy long polling layer to ensure that we aren't getting
 | left behind.
 |
 */

async function checkForBlock() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  if (lastHeight !== blockHeight && lastHeight !== config.index.maxheight) {
    await startIndexer();
  }
  timeout = setTimeout(checkForBlock, 5000);
}

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function startIndexer() {
  clearTimeout(timeout);
  console.log(new Date(Date.now()).toISOString(), "Start indexing");

  indexing = true;

  const blockHeight = await index();

  lastHeight = blockHeight;
  indexing = false;
  console.log(new Date(Date.now()).toISOString(), "Finished indexing");
}

function getWorkerStatus() {
  if (indexing === true) {
    return "indexing";
  }
  return "idle";
}

/*
 |--------------------------------------------------------------------------------
 | Start Watcher
 |--------------------------------------------------------------------------------
 */

const start = async () => {
  await bootstrap();
  lastHeight = await db.indexer.getHeight();

  if (config.index.maxheight && lastHeight >= config.index.maxheight) {
    console.log(`Already at maxheight ${lastHeight}`);
    process.exit(0);
  }
  await fastify
    .listen({ host: config.worker.host, port: config.worker.port })
    .then((address) => {
      console.log(`listening on ${address}`);
      checkForBlock();
    })
    .catch((err) => {
      console.log(err);
      process.exit(1);
    });
};

start();

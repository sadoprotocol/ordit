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
let outdated = false;
let reorging = false;

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

  const outputsHeight = await db.outputs.getHeighestBlock();
  const inscriptionsHeight = await db.inscriptions.getBlockNumber();
  const brcHeight = await db.brc20.events.getBlockNumber();
  const sadoHeight = await db.sado.getBlockNumber();
  const ordHeight = await ord.getHeight();

  return {
    chain: info.chain,
    status: getWorkerStatus(),
    synced: [outputsHeight, inscriptionsHeight, brcHeight, sadoHeight, ordHeight].every(
      (height) => height === info.blocks,
    ),
    indexes: {
      blk: info.blocks,
      out: outputsHeight,
      ins: inscriptionsHeight,
      brc: brcHeight,
      sad: sadoHeight,
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
  if (lastHeight < blockHeight) {
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

  if (indexing === true || reorging === true) {
    outdated = true;
    return;
  }
  indexing = true;

  const blockHeight = await index();
  if (blockHeight === undefined) {
    reorging = true;
    indexing = false;
    outdated = true;
    return;
  }

  lastHeight = blockHeight;

  await stopIndexer();
}

async function stopIndexer() {
  indexing = false;
  if (outdated === true) {
    outdated = false;
    return startIndexer();
  }
  checkForBlock();
}

function getWorkerStatus() {
  if (indexing === true) {
    return "indexing";
  }
  if (reorging === true) {
    return "reorg";
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
  lastHeight = await db.outputs.getHeighestBlock();
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

import debug from "debug";

import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { crawl as crawlBlock } from "./Bitcoin/Outputs/Output";
import { spend } from "./Bitcoin/Outputs/Spend";
import { getReorgHeight } from "./Bitcoin/Reorg";
import { crawl as crawlOrdinals } from "./Ordinals/Crawl";
import { addBlock } from "./Sado/AddBlock";
import { parse } from "./Sado/Parse";
import { resolve } from "./Sado/Resolve";
import { getBlockHeight as getHeighestSadoBlock } from "./Sado/Status";

const log = debug("ordit-worker");

let indexing = false;
let outdated = false;

export async function index() {
  if (indexing === true) {
    outdated = true;
    return;
  }
  indexing = true;

  log("starting indexer");

  const blockHeight = await rpc.blockchain.getBlockCount();

  // ### Reorg
  // Check for potential reorg event on the blockchain.

  log("reorg check");

  const reorgHeight = await getReorgHeight();
  if (reorgHeight !== -1) {
    if (blockHeight - reorgHeight > 100) {
      return log("reorg at block %d is unexpectedly far behind, needs manual review", reorgHeight);
    }
    log("reorg detected at block %d, starting rollback", reorgHeight);
    await Promise.all([reorgUtxos(reorgHeight), reorgSado(reorgHeight)]);
  }

  // ### Parse

  if (config.parser.enabled === true) {
    log("indexing outputs");
    await indexUtxos(blockHeight);
  }

  if (config.sado.enabled === true) {
    log("indexing sado");
    await indexSado(blockHeight);
  }

  if (config.ord.enabled === true) {
    log("indexing ordinals");
    await indexOrdinals();
  }

  log("indexed to block %d", blockHeight);

  indexing = false;
  if (outdated === true) {
    outdated = false;
    await index();
  }

  return blockHeight;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function indexUtxos(blockHeight: number): Promise<void> {
  const outputBlockHeight = await db.outputs.getHeighestBlock();

  // ### Crawl
  // Crawl all blocks up until current block height.

  let height = outputBlockHeight + 1;
  while (height <= blockHeight) {
    await crawlBlock(height, blockHeight);
    log("parsed output block %d", height);
    height += 1;
  }

  await spend();
}

async function reorgUtxos(blockHeight: number) {
  await db.outputs.deleteMany({ "vout.block.height": { $gt: blockHeight } });
}

async function indexSado(blockHeight: number): Promise<void> {
  const sadoBlockHeight = await getHeighestSadoBlock();

  // ### Parse
  // Parse all sado blocks up until current block height.

  let height = sadoBlockHeight + 1;
  while (height <= blockHeight) {
    const hash = await rpc.blockchain.getBlockHash(height);
    const block = await rpc.blockchain.getBlock(hash, 2);
    await addBlock(block);
    log("parsed sado block %d", height);
    height += 1;
  }

  await parse();
  await resolve();
}

async function reorgSado(blockHeight: number) {
  await Promise.all([
    db.sado.deleteMany({ height: { $gt: blockHeight } }),
    db.orders.deleteMany({ "block.height": { $gt: blockHeight } }),
  ]);
}

async function indexOrdinals(): Promise<void> {
  await crawlOrdinals();
}

import debug from "debug";

import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { crawl as crawlBlock } from "./Bitcoin/Outputs/Output";
import { spend } from "./Bitcoin/Outputs/Spend";
import { crawl as crawlOrdinals } from "./Ord/Crawl";
import { addBlock } from "./Sado/AddBlock";
import { parse } from "./Sado/Parse";
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
  const reorgHeight = await getReorgHeight(0, blockHeight);

  if (reorgHeight !== -1) {
    throw new Error("Reorg detected, please run reorg command");
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
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function indexUtxos(blockHeight: number): Promise<void> {
  const outputBlockHeight = await db.outputs.getHeighestBlock();

  // ### Reorg Check
  // Check if the last output block mined is newer than the reorg height. If so,
  // we need to roll back the outputs to the reorg height and parse from that
  // point forward.

  // if (reorgHeight < outputBlockHeight) {
  //   log("Reorg detected, rolling back outputs to block %d", reorgHeight);
  //   // await deleteOutputsAfterHeight(reorgHeight);
  //   // outputBlockHeight = reorgHeight - 1;
  // }

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

async function indexSado(blockHeight: number): Promise<void> {
  const sadoBlockHeight = await getHeighestSadoBlock();

  // ### Reorg Check
  // Check if the last sado block mined is newer than the reorg height. If so,
  // we need to roll back the sado and sado orders to the reorg height and parse
  // from that point forward.

  // if (reorgHeight < sadoBlockHeight) {
  //   log("Reorg detected, rolling back sado to block %d", reorgHeight);
  //   await deleteSadoAfterHeight(reorgHeight);
  //   await deleteSadoOrdersAfterHeight(reorgHeight);
  //   await setBlockHeight(reorgHeight);
  //   sadoBlockHeight = reorgHeight - 1;
  // }

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
}

async function indexOrdinals(): Promise<void> {
  await crawlOrdinals();
}

async function getReorgHeight(start: number, end: number): Promise<number> {
  let result = -1;
  while (start <= end) {
    const mid = Math.floor((start + end) / 2);
    const blockHash = await rpc.blockchain.getBlockHash(mid);
    const output = await db.outputs.findOne({ "vout.block.height": mid });
    if (output === undefined) {
      end = mid - 1;
    } else if (output.vout.block.hash !== blockHash) {
      result = mid;
      end = mid - 1;
    } else {
      start = mid + 1;
    }
  }
  return result;
}

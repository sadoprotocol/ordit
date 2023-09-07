import { config } from "../Config";
import { db } from "../Database";
import { limiter } from "../Libraries/Limiter";
import { rpc } from "../Services/Bitcoin";
import { crawl as crawlBlock } from "./Bitcoin/Outputs/Output";
import { spend } from "./Bitcoin/Outputs/Spend";
import { getReorgHeight } from "./Bitcoin/Reorg";
import { parse as indexBrc20 } from "./Brc20/Parse";
import { parse as indexInscriptions } from "./Inscriptions/Parse";
import { log, perf } from "./Log";
import { addBlock } from "./Sado/AddBlock";
import { parse } from "./Sado/Parse";
import { resolve } from "./Sado/Resolve";
import { getBlockHeight as getHeighestSadoBlock } from "./Sado/Status";

let indexing = false;
let outdated = false;

export async function index() {
  if (indexing === true) {
    outdated = true;
    return;
  }
  indexing = true;

  const ts = perf();

  const blockHeight = await rpc.blockchain.getBlockCount();

  log(`\n ---------- indexing to block ${blockHeight} ----------`);

  // ### Reorg
  // Check for potential reorg event on the blockchain.

  log("\n\n 🏥 Performing reorg check\n");

  const reorgHeight = await getReorgHeight();
  if (reorgHeight !== -1) {
    if (blockHeight - reorgHeight > config.reorg.treshold) {
      return log(`\n   🚨 reorg at block ${reorgHeight} is unexpectedly far behind, needs manual review`);
    }
    log(`\n   🚑 reorg detected at block ${reorgHeight}, starting rollback`);
    await Promise.all([reorgUtxos(reorgHeight), reorgSado(reorgHeight)]);
  }

  log("\n   💯 Chain is healthy");

  // ### Parse

  if (config.ord.enabled === true) {
    log("\n\n 📰 Indexing inscriptions\n");
    await indexInscriptions(blockHeight);
  }

  if (config.brc20.enabled === true) {
    log("\n\n 🪙 Indexing BRC-20\n");
    await indexBrc20();
  }

  if (config.parser.enabled === true) {
    log("\n\n 📖 Indexing outputs\n");
    await indexUtxos(blockHeight);
  }

  if (config.sado.enabled === true) {
    log("\n\n 🌎 Indexing sado\n");
    await indexSado(blockHeight);
  }

  log(`\n\n ✅ Completed [${ts.now}]\n\n`);

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

  const promises = limiter(10);

  let height = outputBlockHeight + 1;
  while (height <= blockHeight) {
    const ts = perf();
    await crawlBlock(height, blockHeight).then((count) => {
      log(`\n   📦 parsed ${count} outputs from block ${height} [${ts.now} seconds]`);
    });
    height += 1;
  }

  await promises.run();
  await spend();
}

async function reorgUtxos(blockHeight: number) {
  await db.outputs.deleteMany({ "vout.block.height": { $gte: blockHeight } });
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

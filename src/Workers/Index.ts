import { config } from "../Config";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { parse as indexUtxos } from "./Bitcoin/Outputs";
import { getReorgHeight } from "./Bitcoin/Reorg";
import { parse as indexBrc20 } from "./Brc20/Parse";
import { parse as indexInscriptions } from "./Inscriptions/Parse";
import { log, perf } from "./Log";
import { addBlock } from "./Sado/AddBlock";
import { parse } from "./Sado/Parse";
import { resolve } from "./Sado/Resolve";
import { getBlockHeight as getHeighestSadoBlock } from "./Sado/Status";

export async function index() {
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

  if (config.parser.enabled === true) {
    log("\n\n 📖 Indexing outputs\n");
    await indexUtxos(blockHeight);
  }

  if (config.ord.enabled === true) {
    log("\n\n 📰 Indexing inscriptions\n");
    await indexInscriptions(blockHeight);
  }

  if (config.brc20.enabled === true) {
    log("\n\n 🪙 Indexing BRC-20\n");
    await indexBrc20(blockHeight);
  }

  if (config.sado.enabled === true) {
    log("\n\n 🌎 Indexing sado\n");
    await indexSado(blockHeight);
  }

  log(`\n\n ✅ Completed [${ts.now}]\n\n`);

  return blockHeight;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function reorgUtxos(blockHeight: number) {
  await db.outputs.deleteMany({ "vout.block.height": { $gte: blockHeight } });
}

async function indexSado(blockHeight: number): Promise<void> {
  const sadoBlockHeight = await getHeighestSadoBlock();

  let height = sadoBlockHeight + 1;
  while (height <= blockHeight) {
    const block = await rpc.blockchain.getBlock(height, 2);
    await addBlock(block);
    height += 1;
  }

  await parse();
  await resolve();
}

async function reorgSado(blockHeight: number) {
  await Promise.all([
    db.sado.deleteMany({ height: { $gte: blockHeight } }),
    db.orders.deleteMany({ "block.height": { $gte: blockHeight } }),
  ]);
}

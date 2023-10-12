import { config } from "~Config";
import { Indexer, IndexHandler } from "~Libraries/Indexer";
import { INSCRIPTION_EPOCH_BLOCK } from "~Libraries/Inscriptions/Constants";
import { rpc } from "~Services/Bitcoin";

import { inscriptionsIndexer } from "./Indexers/Inscriptions";
import { outputIndexer } from "./Indexers/Outputs";
import { utxoIndexer } from "./Indexers/Utxos";

export async function index() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  const indexers: IndexHandler[] = [];

  if (config.utxo.enabled === true) {
    indexers.push(outputIndexer);
    indexers.push(utxoIndexer);
  }

  if (config.ord.enabled === true) {
    indexers.push(inscriptionsIndexer);
  }

  const indexer = new Indexer({ indexers, treshold: { height: INSCRIPTION_EPOCH_BLOCK - 1 } });
  await indexer.run(blockHeight);

  return blockHeight;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 *

async function reorgUtxos(blockHeight: number) {
  await db.outputs.deleteMany({ "vout.block.height": { $gte: blockHeight } });
}

async function indexSado(blockHeight: number): Promise<void> {
  const sadoBlockHeight = await db.sado.getBlockNumber();

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
*/

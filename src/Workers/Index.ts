import { config } from "~Config";
import { Indexer, IndexHandler } from "~Libraries/Indexer";
import { log } from "~Libraries/Log";
import { rpc } from "~Services/Bitcoin";

import { brc20Indexer } from "./Indexers/Brc20";
import { inscriptionsIndexer } from "./Indexers/Inscriptions";
import { outputIndexer } from "./Indexers/Outputs";
import { sadoIndexer } from "./Indexers/Sado";
import { utxoIndexer } from "./Indexers/Utxos";

export async function index() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  const indexers: IndexHandler[] = [];

  if (config.index.outputs === true) {
    indexers.push(outputIndexer);
  }

  if (config.index.utxos === true) {
    indexers.push(utxoIndexer);
  }

  if (config.index.inscriptions === true) {
    indexers.push(inscriptionsIndexer);
    if (config.index.brc20 === true) {
      indexers.push(brc20Indexer);
    }
  }

  if (config.index.sado === true) {
    indexers.push(sadoIndexer);
  }

  if (config.index.maxheight && blockHeight >= config.index.maxheight) {
    log(`Already at maxheight ${blockHeight}`);
    return blockHeight;
  }

  const indexer = new Indexer({ indexers });
  await indexer.run(blockHeight);

  return blockHeight;
}

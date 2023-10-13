import { config } from "~Config";
import { Indexer, IndexHandler } from "~Libraries/Indexer";
import { rpc } from "~Services/Bitcoin";

import { brc20Indexer } from "./Indexers/Brc20";
import { inscriptionsIndexer } from "./Indexers/Inscriptions";
import { outputIndexer } from "./Indexers/Outputs";
import { sadoIndexer } from "./Indexers/Sado";
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
    if (config.brc20.enabled === true) {
      indexers.push(brc20Indexer);
    }
  }

  if (config.sado.enabled === true) {
    indexers.push(sadoIndexer);
  }

  const indexer = new Indexer({ indexers });
  await indexer.run(blockHeight);

  return blockHeight;
}

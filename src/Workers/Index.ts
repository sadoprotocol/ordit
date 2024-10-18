import { config } from "~Config";
import { Indexer, IndexHandler } from "~Libraries/Indexer";
import { rpc } from "~Services/Bitcoin";

import { brc20Indexer } from "./Indexers/Brc20";
import { inscriptionsIndexer } from "./Indexers/Inscriptions";
import { outputIndexer } from "./Indexers/Outputs";
import { runesIndexer } from "./Indexers/Runes";
import { sadoIndexer } from "./Indexers/Sado";
import { utxoIndexer } from "./Indexers/Utxos";

export async function index() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  const indexers: IndexHandler[] = [];

  // WARNING: order of indexers array is important.
  if (!config.index.runesOnly) {
    if (config.index.utxos === true) {
      indexers.push(utxoIndexer);
    }

    if (config.index.sado === true) {
      indexers.push(sadoIndexer);
    }

    if (config.index.runes === true) {
      indexers.push(runesIndexer);
    }

    if (config.index.outputs === true) {
      indexers.push(outputIndexer);
    }

    // Inscriptions indexer depends on outputs collection for owner and creator data
    if (config.index.inscriptions === true) {
      indexers.push(inscriptionsIndexer);
      if (config.index.brc20 === true) {
        indexers.push(brc20Indexer);
      }
    }
  } else {
    indexers.push(runesIndexer);
  }

  const indexer = new Indexer({ indexers });

  if (config.index.maxheight && blockHeight > config.index.maxheight) {
    await indexer.run(config.index.maxheight);

    return config.index.maxheight;
  }

  await indexer.run(blockHeight);

  return blockHeight;
}

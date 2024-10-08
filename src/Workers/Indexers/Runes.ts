import { RuneBlockIndex, RuneUpdater } from "runestone-lib";

import { runes } from "~Database/Runes";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { getNetworkEnum } from "~Libraries/Network";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { blockchain } from "~Services/Bitcoin";

export const runesIndexer: IndexHandler = {
  name: "runes",

  async run(idx: Indexer, { height, log }) {
    if (height < RUNES_BLOCK) return;
    if (idx.blocks.length === 0) return;
    console.log(`\n[Runes indexer]`);
    const network = getNetworkEnum();
    // order blocks
    const blocks = idx.blocks.sort((a, b) => a.height - b.height);

    // check reorg for runes
    const initialHeight = blocks[0].height;
    const runesIndexHeight = await runes.getCurrentBlock();
    if (runesIndexHeight && runesIndexHeight?.height > initialHeight) {
      await runes.resetCurrentBlock({ height: initialHeight, hash: "" });
    }

    const runeBlockIndexes: RuneBlockIndex[] = [];
    log(`🔍 Looking for runestones in blocks...`);
    for (const block of blocks) {
      const runeUpdater = new RuneUpdater(network, block, false, runes, blockchain);

      for (const [txIndex, tx] of block.tx.entries()) {
        await runeUpdater.indexRunes(tx, txIndex);
      }

      const { etchings, mintCounts, utxoBalances, spentBalances, burnedBalances } = runeUpdater;
      const foundRunestone =
        etchings.length || mintCounts.length || utxoBalances.length || spentBalances.length || burnedBalances.length;
      if (foundRunestone) {
        const runeBlockIndex: RuneBlockIndex = {
          block: {
            height: block.height,
            hash: block.hash,
            previousblockhash: block.previousblockhash,
            time: block.time,
          },
          reorg: false,
          etchings,
          mintCounts,
          utxoBalances,
          spentBalances,
          burnedBalances,
        };
        runeBlockIndexes.push(runeBlockIndex);
      }
    }
    console.log(`🪛 ${runeBlockIndexes.length} runestones processed`);
    if (runeBlockIndexes.length > 0) await runes.saveBlocksInBatch(runeBlockIndexes);
  },

  async reorg(height: number) {
    await runes.resetCurrentBlock({ height, hash: "" });
  },
};

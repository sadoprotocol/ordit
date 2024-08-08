import { RuneUpdater } from "runestone-lib";

import { runes } from "~Database/Runes";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";
import { getNetworkEnum } from "~Libraries/Network";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { blockchain } from "~Services/Bitcoin";

export const runesIndexer: IndexHandler = {
  name: "runes",

  async run(idx: Indexer, { height, log }) {
    if (height < RUNES_BLOCK) {
      return;
    }
    log(`[Runes indexer]`);
    const network = getNetworkEnum();

    // order blocks
    const blocks = idx.blocks.sort((a, b) => a.height - b.height);

    for (const block of blocks) {
      const ts = perf();
      const runeUpdater = new RuneUpdater(network, block, false, runes, blockchain);

      for (const [txIndex, tx] of block.tx.entries()) {
        await runeUpdater.indexRunes(tx, txIndex);
      }
      const etchingsLength = runeUpdater.etchings.length;
      const utxoBalancesLength = runeUpdater.utxoBalances.length;
      const spentBalancesLength = runeUpdater.spentBalances.length;
      const burnedBalancesLength = runeUpdater.burnedBalances.length;
      const mintCountsLength = runeUpdater.mintCounts.length;

      const foundRunestone =
        etchingsLength || utxoBalancesLength || spentBalancesLength || burnedBalancesLength || mintCountsLength;
      await runes.saveBlockIndex(runeUpdater);
      if (foundRunestone) {
        // printBlockInfo(
        //   block.height,
        //   etchingsLength,
        //   utxoBalancesLength,
        //   spentBalancesLength,
        //   burnedBalancesLength,
        //   mintCountsLength,
        //   ts.now,
        // );
      }
    }
  },

  async reorg(height: number) {
    await runes.resetCurrentBlockHeight(height);
  },
};

// ------------------------------------------
// UTILS
// ------------------------------------------

function printBlockInfo(
  height: number,
  etchingsLength: number,
  utxoBalancesLength: number,
  spentBalancesLength: number,
  burnedBalancesLength: number,
  mintCountsLength: number,
  time: string,
) {
  const blockStr = `${height}`.padEnd(6, " ");
  const etchingsStr = `${etchingsLength.toLocaleString()} etchings`.padStart(12, " ");
  const balancesStr = `${utxoBalancesLength.toLocaleString()} balances`.padStart(12, " ");
  const spentStr = `${spentBalancesLength.toLocaleString()} spent`.padStart(9, " ");
  const burntStr = `${burnedBalancesLength.toLocaleString()} burnt`.padStart(9, " ");
  const mintStr = `${mintCountsLength.toLocaleString()} mint`.padStart(9, " ");
  const timeStr = `[${time} seconds]`.padStart(15, " ");

  console.log(`${blockStr}:${etchingsStr},${balancesStr},${spentStr},${burntStr},${mintStr} ${timeStr}`);
}

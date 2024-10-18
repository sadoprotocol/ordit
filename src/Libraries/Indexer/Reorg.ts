import { config } from "~Config";
import { db } from "~Database";
import { rpc } from "~Services/Bitcoin";

export async function getReorgHeight(): Promise<number> {
  const indexerHeight = await db.indexer.getHeight();
  const blockchainHeight = await rpc.blockchain.getBlockCount();
  // Determine which indexes are active
  const runesActive = config.index.runes;
  const outputsActive = config.index.outputs && !config.index.runesOnly;

  let outputHighest = indexerHeight;
  let runesHighest = indexerHeight;

  // Array to keep track of all relevant heights
  const heights = [indexerHeight];

  if (outputsActive) {
    outputHighest = await db.outputs.getHeighestBlock();
    heights.push(outputHighest);
  }

  if (runesActive) {
    const runesCurrentBlock = await db.runes.getCurrentBlock();
    if (runesCurrentBlock) {
      runesHighest = runesCurrentBlock.height;
      heights.push(runesHighest);
    }
  }

  const lowestHeight = Math.min(...heights);

  if (lowestHeight > blockchainHeight) return blockchainHeight;
  if (lowestHeight < blockchainHeight) return lowestHeight;

  // If no reorganization is needed, return -1
  return -1;
}

import { db } from "~Database";
import { rpc } from "~Services/Bitcoin";

export async function getReorgHeight(): Promise<number> {
  // Indexer collection height is updated after all toher indexers.
  // This ensures all indexers start at the same height
  // on reindex, reorg or restart.
  const indexerHeight = await db.indexer.getHeight();
  const blockchainHeight = await rpc.blockchain.getBlockCount();
  return indexerHeight > blockchainHeight ? blockchainHeight : -1;
}

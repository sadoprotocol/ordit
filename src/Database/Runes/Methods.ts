import { Filter } from "mongodb";
import { BlockInfo, RuneEtching, RuneUtxoBalance } from "runestone-lib";

import { collectionBlocks, collectionEtchings, collectionUtxoBalances } from "./Collection";

export const runes = {
  collectionBlocks,
  collectionEtchings,
  collectionUtxoBalances,

  // ### Core Methods
  findBlock,
  findRune,
  countBlocks,
  addressBalances,
};

async function findBlock(height: number): Promise<BlockInfo | null> {
  const filter = { height };
  const block = await collectionBlocks.findOne<BlockInfo>(filter);
  return block;
}

async function countBlocks(filter: Filter<BlockInfo>) {
  return collectionBlocks.countDocuments(filter);
}

async function findRune(runeTicker: string): Promise<RuneEtching | null> {
  const filter = { runeTicker };
  const balances = await collectionEtchings.findOne<RuneEtching>(filter);
  return balances;
}

async function addressBalances(address: string): Promise<RuneUtxoBalance[] | null> {
  const filter: Filter<RuneUtxoBalance> = { address };
  const cursor = collectionUtxoBalances.find<RuneUtxoBalance>(filter);

  const balances: RuneUtxoBalance[] = await cursor.toArray();

  if (balances.length === 0) {
    return null;
  }

  return balances;
}

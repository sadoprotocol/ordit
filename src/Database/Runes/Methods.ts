import { Filter } from "mongodb";
import { BlockIdentifier, BlockInfo, RuneBlockIndex, RuneEtching, RuneLocation, RuneUtxoBalance } from "runestone-lib";

import { client, mongo } from "~Services/Mongo";
import { convertBigIntToString, convertStringToBigInt } from "~Utilities/Helpers";

import { collectionBlocks, collectionEtchings, collectionMintCount, collectionUtxoBalances } from "./Collection";

export const runes = {
  ...mongo,
  collectionBlocks,
  collectionEtchings,
  collectionUtxoBalances,
  collectionMintCount,

  // Core Methods
  findRune,
  countBlocks,
  addressBalances,
  addressRunesUTXOs,

  // RunestoneStorage implementation
  disconnect,
  getBlockhash,
  getCurrentBlock,
  getEtching,
  getRuneLocation,
  getUtxoBalance,
  getValidMintCount,
  resetCurrentBlock,
  resetCurrentBlockHeight,
  saveBlockIndex,
  seedEtchings,
};

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

async function addressRunesUTXOs(address: string, runeTicker: string): Promise<RuneUtxoBalance[] | null> {
  const filter: Filter<RuneUtxoBalance> = { address, runeTicker };
  const cursor = collectionUtxoBalances.find<RuneUtxoBalance>(filter);

  const balances: RuneUtxoBalance[] = await cursor.toArray();

  if (balances.length === 0) {
    return null;
  }

  return balances;
}

/**
 * RunestoneStorage interface implementation
 */
async function disconnect() {
  await client.close();
}

async function getBlockhash(blockHeight: number): Promise<string | null> {
  const block = await collectionBlocks.findOne({ height: blockHeight });
  return block ? block.hash : null;
}

async function getCurrentBlock(): Promise<BlockIdentifier | null> {
  const block = await collectionBlocks.find().sort({ height: -1 }).limit(1).next();
  return block ? { height: block.height, hash: block.hash } : null;
}

async function resetCurrentBlock(block: BlockIdentifier): Promise<void> {
  await collectionBlocks.deleteMany({ height: { $gt: block.height } });

  await collectionBlocks.updateOne({ height: block.height }, { $set: { hash: block.hash } }, { upsert: true });
}

async function resetCurrentBlockHeight(height: number): Promise<void> {
  await collectionBlocks.deleteMany({ height: { $gt: height } });
  const hash = await getBlockhash(height);
  if (!hash) {
    throw new Error(`Error getting block hash ${height}`);
  }

  await collectionBlocks.updateOne({ height }, { $set: { hash } }, { upsert: true });
}

async function seedEtchings(runes_etchings: RuneEtching[]): Promise<void> {
  const bulkOps = runes_etchings.map((etching) => ({
    updateOne: {
      filter: { runeId: etching.runeId },
      update: { $set: convertBigIntToString(etching) },
      upsert: true,
    },
  }));

  await collectionEtchings.bulkWrite(bulkOps);
}

async function saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
  await collectionBlocks.insertOne(runeBlockIndex.block);

  const bulkEtchings = runeBlockIndex.etchings.map((etching) => ({
    updateOne: {
      filter: { runeId: etching.runeId },
      update: { $set: convertBigIntToString(etching) },
      upsert: true,
    },
  }));

  if (bulkEtchings.length > 0) {
    await collectionEtchings.bulkWrite(bulkEtchings);
  }

  const bulkUtxoBalances = runeBlockIndex.utxoBalances.map((utxo) => ({
    updateOne: {
      filter: { txid: utxo.txid, vout: utxo.vout },
      update: { $set: utxo },
      upsert: true,
    },
  }));

  if (bulkUtxoBalances.length > 0) {
    await collectionUtxoBalances.bulkWrite(bulkUtxoBalances);
  }

  const bulkSpentBalances = runeBlockIndex.spentBalances.map((spent) => ({
    deleteOne: {
      filter: { txid: spent.txid, vout: spent.vout },
    },
  }));

  if (bulkSpentBalances.length > 0) {
    await collectionUtxoBalances.bulkWrite(bulkSpentBalances);
  }

  const bulkBurnedBalances = runeBlockIndex.burnedBalances.map((burned) => ({
    deleteOne: {
      filter: { "runeId.block": burned.runeId.block, "runeId.tx": burned.runeId.tx },
    },
  }));

  if (bulkBurnedBalances.length > 0) {
    await collectionUtxoBalances.bulkWrite(bulkBurnedBalances);
  }
}
async function getEtching(runeLocation: string): Promise<RuneEtching | null> {
  const runeLocSplit = runeLocation.split(":", 2);
  const _runeLocation: RuneLocation = {
    block: Number(runeLocSplit[0]),
    tx: Number(runeLocSplit[1]),
  };
  const etching = await collectionEtchings.findOne({ runeId: _runeLocation });
  convertStringToBigInt(etching);
  return etching ? (etching as unknown as RuneEtching) : null;
}

async function getValidMintCount(runeLocation: string, blockheight: number): Promise<number> {
  const result = await collectionMintCount
    .aggregate([
      {
        $match: { runeId: runeLocation, blockHeight: { $lte: blockheight } },
      },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ])
    .toArray();

  return result.length > 0 ? result[0].total : 0;
}

async function getRuneLocation(runeTicker: string): Promise<RuneLocation | null> {
  const etching = await collectionEtchings.findOne({ runeTicker });
  convertStringToBigInt(etching);
  return etching ? (etching.runeId as RuneLocation) : null;
}

async function getUtxoBalance(txid: string, vout: number): Promise<RuneUtxoBalance[]> {
  const balances = await collectionUtxoBalances.find({ txid, vout }).toArray();
  return balances.map((balance) => ({
    txid: balance.txid,
    vout: balance.vout,
    address: balance.address,
    scriptPubKey: balance.scriptPubKey,
    runeId: balance.runeId,
    satValue: balance.satValue,
    runeTicker: balance.runeTicker,
    amount: BigInt(balance.amount),
  }));
}

import { BlockIdentifier, RuneBlockIndex, RuneEtching, RuneLocation, RuneUtxoBalance } from "runestone-lib";

import { FindPaginatedParams, paginate } from "~Libraries/Paginate";
import { client, mongo } from "~Services/Mongo";
import { convertBigIntToString } from "~Utilities/Helpers";

import { collectionBlockInfo, collectionOutputs, RuneOutput, SimplifiedRuneBlockIndex } from "./Collection";

export const runes = {
  ...mongo,
  collectionBlockInfo,
  collectionOutputs,

  // Core Methods
  getEtchingByTicker,
  addressBalances,
  addressRunesUTXOs,
  saveBlocksInBatch,

  // RunestoneStorage implementation
  disconnect,
  getBlockhash,
  getCurrentBlock,
  getEtching,
  getRuneLocation,
  getUtxoBalance,
  getValidMintCount,
  resetCurrentBlock,
  saveBlockIndex,
  seedEtchings,
};

async function getEtchingByTicker(runeTicker: string): Promise<RuneEtching | null> {
  const result = await collectionBlockInfo
    .aggregate<RuneEtching>([
      { $unwind: "$etchings" },
      { $match: { "etchings.runeTicker": runeTicker } },
      { $replaceRoot: { newRoot: "$etchings" } },
      { $limit: 1 },
    ])
    .toArray();

  return result.length > 0 ? result[0] : null;
}

export async function addressBalances(address: string): Promise<{ runeTicker: string; balance: string }[]> {
  const result = await collectionOutputs
    .aggregate<{ runeTicker: string; balance: string }>([
      {
        $match: { address, spentTxid: { $exists: false } },
      },
      {
        $group: {
          _id: "$runeTicker",
          totalBalance: { $sum: { $toDouble: "$amount" } },
        },
      },
      {
        $project: {
          _id: 0,
          runeTicker: "$_id",
          balance: { $toString: "$totalBalance" },
        },
      },
    ])
    .toArray();

  return result;
}

async function addressRunesUTXOs(params: FindPaginatedParams<RuneOutput> = {}) {
  return paginate.findPaginated(collectionOutputs, params);
}

/**
 * RunestoneStorage interface implementation
 */
async function disconnect() {
  await client.close();
}

async function getBlockhash(blockHeight: number): Promise<string | null> {
  const runeBlockInfo = await collectionBlockInfo.findOne({ "block.height": blockHeight });
  return runeBlockInfo ? runeBlockInfo.block.hash : null;
}

async function getCurrentBlock(): Promise<BlockIdentifier | null> {
  const runeBlockInfo = await collectionBlockInfo.find().sort({ "block.height": -1 }).limit(1).next();
  return runeBlockInfo ? { height: runeBlockInfo.block.height, hash: runeBlockInfo.block.hash } : null;
}

async function resetCurrentBlock(block: BlockIdentifier): Promise<void> {
  await collectionOutputs.deleteMany({ txBlockHeight: { $gt: block.height } });
  await collectionBlockInfo.deleteMany({ "block.height": { $gt: block.height } });
}

export async function seedEtchings(runesEtchings: RuneEtching[]): Promise<void> {
  for (const etching of runesEtchings) {
    if (!etching.valid) continue;

    const blockHeight = etching.runeId.block;
    const filter = { "block.height": blockHeight };

    const existingDocument = await collectionBlockInfo.findOne(filter);
    if (existingDocument) {
      await collectionBlockInfo.updateOne(filter, { $push: { etchings: etching } });
    } else {
      const newDocument: SimplifiedRuneBlockIndex = {
        block: {
          height: blockHeight,
          hash: etching.txid,
          previousblockhash: "---",
          time: 0,
        },
        reorg: false,
        etchings: [etching],
        mintCounts: [],
        burnedBalances: [],
      };

      await collectionBlockInfo.insertOne(newDocument);
    }
  }
}

async function saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
  const filter = { "block.height": runeBlockIndex.block.height };

  const sanitizedBlockIndex = convertBigIntToString(runeBlockIndex);

  await collectionBlockInfo.updateOne(filter, { $set: sanitizedBlockIndex }, { upsert: true });

  if (runeBlockIndex.utxoBalances && runeBlockIndex.utxoBalances.length > 0) {
    const newUtxos = runeBlockIndex.utxoBalances.map((utxo) => ({
      ...utxo,
      txBlockHeight: runeBlockIndex.block.height,
    }));

    await collectionOutputs.insertMany(newUtxos);
  }

  for (const spentUtxo of runeBlockIndex.spentBalances) {
    await collectionOutputs.updateOne(
      { txid: spentUtxo.txid, vout: spentUtxo.vout },
      { $set: { spentTxid: spentUtxo.spentTxid, blockHeight: runeBlockIndex.block.height } },
    );
  }
}

async function saveBlocksInBatch(runeBlockIndexes: RuneBlockIndex[]): Promise<void> {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      for (const runeBlockIndex of runeBlockIndexes) {
        await saveBlockIndex(runeBlockIndex);
      }
    });

    console.log("✅ Transaction committed successfully");
  } catch (error) {
    console.error("Error saving blocks in batch, transaction aborted:", error);
    throw error;
  } finally {
    session.endSession();
  }
}

async function getEtching(runeLocation: string): Promise<RuneEtching | null> {
  const [blockHeightStr, txStr] = runeLocation.split(":");
  const runeId: RuneLocation = {
    block: parseInt(blockHeightStr, 10),
    tx: parseInt(txStr, 10),
  };

  const document = await collectionBlockInfo.findOne<RuneBlockIndex>({ "block.height": runeId.block });

  if (!document) return null;

  const etching = document.etchings.find(
    (etching) => etching.runeId.block === runeId.block && etching.runeId.tx === runeId.tx,
  );

  return etching || null;
}

async function getValidMintCount(runeLocation: string, blockheight: number): Promise<number> {
  const [blockStr, txStr] = runeLocation.split(":");
  const targetRuneLocation: RuneLocation = {
    block: parseInt(blockStr, 10),
    tx: parseInt(txStr, 10),
  };

  const result = await collectionBlockInfo
    .aggregate<{ totalMintCount: number }>([
      { $match: { "block.height": { $lte: blockheight } } },
      { $unwind: "$mintCounts" },
      {
        $match: {
          "mintCounts.mint.block": targetRuneLocation.block,
          "mintCounts.mint.tx": targetRuneLocation.tx,
        },
      },
      {
        $group: {
          _id: null,
          totalMintCount: { $sum: "$mintCounts.count" },
        },
      },
      { $project: { _id: 0, totalMintCount: 1 } },
    ])
    .toArray();

  return result.length > 0 ? result[0].totalMintCount : 0;
}

async function getRuneLocation(runeTicker: string): Promise<RuneLocation | null> {
  const result = await collectionBlockInfo
    .aggregate<RuneLocation>([
      { $unwind: "$etchings" },
      { $match: { "etchings.runeTicker": runeTicker } },
      { $project: { _id: 0, runeId: "$etchings.runeId" } },
      { $limit: 1 },
    ])
    .toArray();

  return result.length > 0 ? result[0] : null;
}

async function getUtxoBalance(txid: string, vout: number): Promise<RuneUtxoBalance[]> {
  return await collectionOutputs.find<RuneUtxoBalance>({ txid, vout }).toArray();
}

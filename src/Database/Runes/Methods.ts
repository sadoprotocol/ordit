import { Decimal128 } from "mongodb";
import { BlockIdentifier, RuneBlockIndex, RuneEtching, RuneLocation, RuneUtxoBalance } from "runestone-lib";

import { ignoreDuplicateErrors } from "~Database/Utilities";
import { FindPaginatedParams, paginate } from "~Libraries/Paginate";
import { client, mongo } from "~Services/Mongo";
import { convertBigIntToString, convertStringToBigInt } from "~Utilities/Helpers";

import {
  collectionBlockInfo,
  collectionEtching,
  collectionOutputs,
  RuneOutput,
  SimplifiedRuneBlockIndex,
} from "./Collection";

export const runes = {
  ...mongo,
  collectionBlockInfo,
  collectionOutputs,
  collectionEtching,

  // Core Methods
  getEtchingByTicker,
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
  saveBlockIndex,
  seedEtchings,
};

async function getEtchingByTicker(runeTicker: string): Promise<RuneEtching | null> {
  return await collectionEtching.findOne({ runeTicker });
}

export async function addressBalances(address: string): Promise<{ runeTicker: string; balance: string }[]> {
  const result = await collectionOutputs
    .aggregate<{ runeTicker: string; totalBalance: Decimal128 }>([
      {
        $match: { address, spentTxid: { $exists: false } },
      },
      {
        $group: {
          _id: "$runeTicker",
          totalBalance: {
            $sum: {
              $toDecimal: "$amount",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          runeTicker: "$_id",
          totalBalance: 1,
        },
      },
    ])
    .toArray();

  const balances = result.map(({ runeTicker, totalBalance }) => ({
    runeTicker,
    balance: totalBalance.toString(),
  }));

  return balances;
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
  await collectionOutputs.updateMany(
    { spentBlockHeight: { $gt: block.height } },
    { $unset: { spentTxid: "", spentBlockHeight: "" } },
  );
  await collectionBlockInfo.deleteMany({ "block.height": { $gt: block.height } });
  await collectionEtching.deleteMany({ "runeId.block": { $gt: block.height } });
}

export async function seedEtchings(runesEtchings: RuneEtching[]): Promise<void> {
  const bulkOps = runesEtchings.map((etching) => ({
    insertOne: {
      document: convertBigIntToString(etching),
    },
  }));

  await collectionEtching.bulkWrite(bulkOps).catch(ignoreDuplicateErrors);
}

async function saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
  const sanitizedBlockIndex: SimplifiedRuneBlockIndex = {
    block: runeBlockIndex.block,
    mintCounts: runeBlockIndex.mintCounts,
    burnedBalances: runeBlockIndex.burnedBalances,
  };

  const normalizedBlockIndex = convertBigIntToString(sanitizedBlockIndex);

  await collectionBlockInfo.insertOne(normalizedBlockIndex).catch(ignoreDuplicateErrors);

  const bulkEtchings = runeBlockIndex.etchings.map((etching) => ({
    insertOne: {
      document: convertBigIntToString(etching),
    },
  }));

  if (bulkEtchings.length > 0) await collectionEtching.bulkWrite(bulkEtchings).catch(ignoreDuplicateErrors);

  if (runeBlockIndex.utxoBalances && runeBlockIndex.utxoBalances.length > 0) {
    const newUtxos = runeBlockIndex.utxoBalances.map((utxo) => {
      return convertBigIntToString({
        ...utxo,
        txBlockHeight: runeBlockIndex.block.height,
      });
    });
    await collectionOutputs.insertMany(newUtxos).catch(ignoreDuplicateErrors);
  }

  for (const spentUtxo of runeBlockIndex.spentBalances) {
    await collectionOutputs.updateOne(
      { txid: spentUtxo.txid, vout: spentUtxo.vout, runeTicker: spentUtxo.runeTicker },
      { $set: { spentTxid: spentUtxo.spentTxid, spentBlockHeight: runeBlockIndex.block.height } },
    );
  }
}

async function getEtching(runeLocation: string): Promise<RuneEtching | null> {
  const [blockHeightStr, txStr] = runeLocation.split(":");
  const runeId: RuneLocation = {
    block: parseInt(blockHeightStr, 10),
    tx: parseInt(txStr, 10),
  };

  const etching = await collectionEtching.findOne<RuneEtching>({
    "runeId.block": runeId.block,
    "runeId.tx": runeId.tx,
  });

  if (!etching) return null;

  return convertStringToBigInt(etching);
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
  return (await collectionEtching.findOne({ runeTicker }))?.runeId ?? null;
}

async function getUtxoBalance(txid: string, vout: number): Promise<RuneUtxoBalance[]> {
  const utxoBalance = await collectionOutputs.find<RuneUtxoBalance>({ txid, vout }).toArray();
  const utxoBalanceFlat = utxoBalance.map((utxo) => convertStringToBigInt(utxo));
  return utxoBalanceFlat;
}

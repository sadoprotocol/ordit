import { Filter } from "mongodb";
import { BlockIdentifier, BlockInfo, RuneBlockIndex, RuneEtching, RuneLocation, RuneUtxoBalance } from "runestone-lib";

import { ignoreDuplicateErrors } from "~Database/Utilities";
import { FindPaginatedParams, paginate } from "~Libraries/Paginate";
import { client, mongo } from "~Services/Mongo";
import { convertBigIntToString, convertStringToBigInt } from "~Utilities/Helpers";

import { collectionBlocks, collectionRunes, collectionUtxoBalances, Mint, RuneEntry } from "./Collection";

export const runes = {
  ...mongo,
  collectionBlocks,
  collectionRunes,
  collectionUtxoBalances,

  // Core Methods
  findRune,
  findRunes,
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

async function findRune(
  runeTicker: string,
  verbose: boolean = false,
): Promise<RuneEntry | Partial<Omit<RuneEntry, "mints">> | null> {
  const filter = { runeTicker };
  const rune = await collectionRunes.findOne<RuneEntry>(filter);
  if (!rune) return null;
  if (verbose) return rune;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { mints, ...runeWithoutMints } = rune;
  return runeWithoutMints;
}

async function findRunes(
  runeTickers: string[],
  verbose: boolean = false,
): Promise<(RuneEntry | Partial<Omit<RuneEntry, "mints">>)[]> {
  const filter = { runeTicker: { $in: runeTickers } };
  const runes = await collectionRunes.find<RuneEntry>(filter).toArray();

  if (verbose) return runes;

  return runes.map((rune) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { mints, ...runeWithoutMints } = rune;
    return runeWithoutMints;
  });
}

async function addressBalances(address: string, withSpents: boolean = false): Promise<RuneUtxoBalance[]> {
  let filter: Filter<RuneUtxoBalance> = { address };
  if (!withSpents) {
    filter = { address, spentTxid: { $exists: false } };
  }
  return await collectionUtxoBalances.find<RuneUtxoBalance>(filter).toArray();
}

async function addressRunesUTXOs(params: FindPaginatedParams<RuneUtxoBalance> = {}) {
  return paginate.findPaginated(collectionUtxoBalances, params);
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
    insertOne: {
      document: convertBigIntToString(etching),
    },
  }));

  await collectionRunes.bulkWrite(bulkOps);
}

async function saveBlockIndex(runeBlockIndex: RuneBlockIndex): Promise<void> {
  await collectionBlocks.insertOne(runeBlockIndex.block).catch(ignoreDuplicateErrors);

  // RUNE ENTRY
  const bulkEtchings = runeBlockIndex.etchings.map((etching) => ({
    insertOne: {
      document: convertBigIntToString(etching),
    },
  }));

  if (bulkEtchings.length > 0) await collectionRunes.bulkWrite(bulkEtchings).catch(ignoreDuplicateErrors);

  // RUNE UTXOS
  const bulkUtxoBalances = runeBlockIndex.utxoBalances.map((utxo) => {
    const { amount, ...rest } = utxo;

    return {
      insertOne: {
        document: {
          ...rest,
          amount: amount.toString(),
        },
      },
    };
  });

  if (bulkUtxoBalances.length > 0)
    await collectionUtxoBalances.bulkWrite(bulkUtxoBalances).catch(ignoreDuplicateErrors);

  // RUNE SPENTS
  const bulkSpentBalances = runeBlockIndex.spentBalances.map((spent) => ({
    updateOne: {
      filter: { txid: spent.txid, vout: spent.vout },
      update: { $set: { spentTxid: spent.spentTxid } },
    },
  }));

  if (bulkSpentBalances.length > 0) await collectionUtxoBalances.bulkWrite(bulkSpentBalances);

  // RUNE MINTS
  const bulkMintCounts = runeBlockIndex.mintCounts.map((mintCount) => {
    const mint: Mint = {
      block: runeBlockIndex.block.height,
      count: mintCount.count,
    };

    return {
      updateOne: {
        filter: { runeId: mintCount.mint },
        update: {
          $push: { mints: mint },
        },
        upsert: true,
      },
    };
  });

  if (bulkMintCounts.length > 0) {
    await collectionRunes.bulkWrite(bulkMintCounts);
  }

  // RUNE BURNT
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
  const etching = await collectionRunes.findOne({ runeId: _runeLocation });
  convertStringToBigInt(etching);
  return etching ? (etching as unknown as RuneEtching) : null;
}

async function getValidMintCount(runeLocation: string, blockheight: number): Promise<number> {
  const runeLocSplit = runeLocation.split(":", 2);
  const _runeLocation: RuneLocation = {
    block: Number(runeLocSplit[0]),
    tx: Number(runeLocSplit[1]),
  };

  const runeEntry = await collectionRunes.findOne({ runeId: _runeLocation });

  if (!runeEntry || !runeEntry.mints) {
    return 0;
  }

  const validMints = runeEntry.mints.filter((mint: Mint) => mint.block <= blockheight);
  const totalCount = validMints.reduce((sum: number, mint: Mint) => sum + mint.count, 0);

  return totalCount;
}

async function getRuneLocation(runeTicker: string): Promise<RuneLocation | null> {
  const etching = await collectionRunes.findOne({ runeTicker });
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

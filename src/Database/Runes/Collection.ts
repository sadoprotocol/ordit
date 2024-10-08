import { RuneBlockIndex, RuneUtxoBalance } from "runestone-lib";

import { CollectionRegistrar, mongo } from "~Services/Mongo";

export const collectionBlockInfo = mongo.db.collection<SimplifiedRuneBlockIndex>("runes_blocks");
export const collectionOutputs = mongo.db.collection<RuneOutput>("runes_outputs");

export const registrarBlockInfo: CollectionRegistrar = {
  name: "runes_blocks",
  indexes: [[{ "block.height": 1 }, { unique: true }]],
};

export const registrarOutput: CollectionRegistrar = {
  name: "runes_outputs",
  indexes: [
    [{ txid: 1, vout: 1, runeTicker: 1 }, { unique: true }],
    [{ address: 1 }],
    [{ runeTicker: 1 }],
    [{ address: 1, runeTicker: 1 }],
  ],
};

export type RuneOutput = RuneUtxoBalance & { txBlockHeight: number; spentTxid?: string }; // txBlockHeight needed for reorg
export type SimplifiedRuneBlockIndex = Omit<RuneBlockIndex, "utxoBalances" | "spentBalances">;

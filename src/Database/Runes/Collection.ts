import { BlockInfo, RuneBalance, RuneEtching, RuneUtxoBalance } from "runestone-lib";

import { CollectionRegistrar, mongo } from "~Services/Mongo";

export const collectionBlocks = mongo.db.collection<BlockInfo>("runes_blocks");
export const collectionUtxoBalances = mongo.db.collection<RuneUtxoBalance>("runes_utxoBalances");
export const collectionRunes = mongo.db.collection<RuneEntry>("runes");

export const registrarBlocks: CollectionRegistrar = {
  name: "runes_blocks",
  indexes: [[{ height: 1 }, { unique: true }]],
};

export const registrarUtxoBalance: CollectionRegistrar = {
  name: "runes_utxoBalances",
  indexes: [
    [{ txid: 1, vout: 1, runeTicker: 1 }, { unique: true }],
    [{ address: 1 }],
    [{ runeTicker: 1 }],
    [{ address: 1, runeTicker: 1 }],
  ],
};

export const registrarRunes: CollectionRegistrar = {
  name: "runes",
  indexes: [
    [{ runeTicker: 1 }, { unique: true }],
    [{ runeId: 1 }, { unique: true }],
  ],
};

export type Mint = { block: number; count: number };
export type Burned = RuneBalance & { block: number };
export type RuneEntry = RuneEtching & { mints: Mint[]; burned: Burned[] };

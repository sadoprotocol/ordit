import { BlockInfo, RuneEtching, RuneMintCount, RuneUtxoBalance } from "runestone-lib";

import { CollectionRegistrar, mongo } from "~Services/Mongo";

export const collectionBlocks = mongo.db.collection<BlockInfo>("runes_blocks");
export const collectionUtxoBalances = mongo.db.collection<RuneUtxoBalance>("runes_utxoBalances");
export const collectionEtchings = mongo.db.collection<RuneEtching>("runes_etchings");
export const collectionMintCount = mongo.db.collection<RuneMintCount>("runes_mintcount");

export const registrarBlocks: CollectionRegistrar = {
  name: "runes_blocks",
  indexes: [],
};
export const registrarUtxoBalance: CollectionRegistrar = {
  name: "runes_utxoBalances",
  indexes: [[{ address: 1 }], [{ runeTicker: 1 }], [{ address: 1, runeTicker: 1 }]],
};

export const registrarEtchings: CollectionRegistrar = {
  name: "runes_etchings",
  indexes: [
    [{ runeTicker: 1 }, { unique: true }],
    [{ runeId: 1 }, { unique: true }],
  ],
};
export const registrarMintCount: CollectionRegistrar = {
  name: "runes_mintcount",
  indexes: [],
};

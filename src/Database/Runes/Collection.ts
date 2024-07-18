import { Block } from "bitcoinjs-lib";
import { RuneEtching, RuneUtxoBalance } from "runestone-lib";

import { CollectionRegistrar, mongo } from "~Services/Mongo";

export const collectionBlocks = mongo.db.collection<Block>("runes_blocks");
export const collectionUtxoBalances = mongo.db.collection<RuneUtxoBalance>("runes_utxoBalances");
export const collectionEtchings = mongo.db.collection<RuneEtching>("runes_etchings");

export const registrarBlocks: CollectionRegistrar = {
  name: "runes_blocks",
  indexes: [],
};
export const registrarUtxoBalance: CollectionRegistrar = {
  name: "runes_utxoBalances",
  indexes: [],
};
export const registrarEtchings: CollectionRegistrar = {
  name: "runes_etchings",
  indexes: [],
};

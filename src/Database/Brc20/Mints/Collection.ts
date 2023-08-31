import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Mint>("brc20_mints");

export const registrar: CollectionRegistrar = {
  name: "brc20_mints",
  indexes: [[{ inscription: 1 }, { unique: true }], [{ tick: 1 }], [{ mintedBy: 1 }]],
};

export type Mint = {
  inscription: string;
  tick: string;
  amount: number;
  minter: string;
  timestamp: number;
};

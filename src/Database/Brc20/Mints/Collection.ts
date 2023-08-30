import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Mint>("brc20_mints");

export const registrar: CollectionRegistrar = {
  name: "brc20_mints",
  indexes: [[{ inscription: 1 }, { unique: true }], [{ address: 1 }], [{ token: 1 }]],
};

export type Mint = {
  inscription: string;
  address: string;
  token: string;
  amount: number;
  ts: number;
};

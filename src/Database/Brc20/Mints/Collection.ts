import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Mint>("brc20_mints");

export const registrar: CollectionRegistrar = {
  name: "brc20_mints",
  indexes: [[{ address: 1 }], [{ tick: 1 }]],
};

export type Mint = {
  address: string;
  tick: string;
  balance: number;
};

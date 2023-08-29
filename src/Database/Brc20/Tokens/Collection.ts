import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Token>("brc20_tokens");

export const registrar: CollectionRegistrar = {
  name: "brc20_tokens",
  indexes: [[{ address: 1 }], [{ tick: 1 }, { unique: true }]],
};

export type Token = {
  id: string;
  address: string;
  tick: string;
  max: number;
  balance: number;
  lim?: number;
};

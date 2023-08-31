import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Token>("brc20_tokens");

export const registrar: CollectionRegistrar = {
  name: "brc20_tokens",
  indexes: [[{ tick: 1 }, { unique: true }], [{ creator: 1 }]],
};

export type Token = {
  inscription: string;
  tick: string;
  max: number;
  amount: number;
  limit: number | null;
  decimal: number;
  creator: string;
  timestamp: number;
};

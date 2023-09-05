import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<TokenHolder>("brc20_holders");

export const registrar: CollectionRegistrar = {
  name: "brc20_holders",
  indexes: [[{ address: 1 }], [{ tick: 1 }]],
};

export type TokenHolder = {
  address: string;
  tick: string;
  total: number;
  available: number;
  transferable: number;
};

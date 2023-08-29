import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<TokenTransfer>("brc20_transfers");

export const registrar: CollectionRegistrar = {
  name: "brc20_transfers",
  indexes: [[{ tick: 1 }], [{ address: 1 }], [{ inscription: 1 }]],
};

export type TokenTransfer = {
  tick: string;
  address: string;
  inscription: string;
  amount: number;
};

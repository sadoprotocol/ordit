import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<TokenTransfer>("brc20_transfers");

export const registrar: CollectionRegistrar = {
  name: "brc20_transfers",
  indexes: [[{ token: 1 }], [{ sender: 1 }], [{ inscription: 1 }]],
};

export type TokenTransfer = {
  token: string;
  sender: string;
  receiver?: string;
  inscription: string;
  amount: number;
};

import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<TokenTransfer>("brc20_transfers");

export const registrar: CollectionRegistrar = {
  name: "brc20_transfers",
  indexes: [[{ inscription: 1 }], [{ tick: 1 }], [{ "from.address": 1 }], [{ "to.address": 1 }]],
};

export type TokenTransfer = {
  inscription: string;
  token: string;
  tick: string;
  amount: number;
  from: TokenTransferPoint;
  to: TokenTransferPoint | null;
};

export type TokenTransferPoint = {
  address: string;
  block: number;
  timestamp: number;
};

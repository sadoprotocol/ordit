import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<TokenTransfer>("brc20_transfers");

export const registrar: CollectionRegistrar = {
  name: "brc20_transfers",
  indexes: [[{ inscription: 1 }], [{ tick: 1 }], [{ from: 1 }], [{ to: 1 }]],
};

export type TokenTransfer = {
  inscription: string;
  tick: string;
  amount: number;
  from: string;
  to: string | null;
  timestamp: number;
};

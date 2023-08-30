import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<Account>("brc20_accounts");

export const registrar: CollectionRegistrar = {
  name: "brc20_accounts",
  indexes: [[{ address: 1 }]],
};

export type Account = {
  address: string;
  tokens: AccountTokens;
};

export type AccountTokens = {
  [token: string]: AccountBalance;
};

export type AccountBalance = {
  overall: number;
  available: number;
  transferable: number;
};

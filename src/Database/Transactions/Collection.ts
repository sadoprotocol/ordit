import { CollectionRegistrar, mongo } from "../../Services/Mongo";
import { ExpandedTransaction } from "../../Utilities/Transaction";

export const collection = mongo.db.collection<TransactionDocument>("transactions");

export const registrar: CollectionRegistrar = {
  name: "transactions",
  indexes: [[{ addresses: 1 }], [{ addresses: 1, blockHeight: 1 }]],
};

export type TransactionDocument = {
  addresses: string[];
  blockHeight: number;
} & ExpandedTransaction;

import { mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<Indexer>("indexer");

export type Indexer = {
  block: number;
};

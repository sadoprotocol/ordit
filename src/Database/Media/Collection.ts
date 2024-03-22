import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<MediaDocument>("media");

export const registrar: CollectionRegistrar = {
  name: "media",
  indexes: [
    [
      {
        outpoint: 1,
      },
    ],
  ],
};

export type MediaDocument = {
  outpoint: string;
  type: string;
  encoding: string;
  size: number;
  content: string;
  number: number;
  timestamp: number;
};

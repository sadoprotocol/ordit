import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<Inscription>("inscriptions");

export const registrar: CollectionRegistrar = {
  name: "inscriptions",
  indexes: [
    [
      {
        id: 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        height: 1,
      },
    ],
    [
      {
        number: 1,
      },
    ],
    [
      {
        sat: 1,
      },
    ],
    [
      {
        mimeType: 1,
      },
    ],
    [
      {
        mimeSubtype: 1,
      },
    ],
    [
      {
        mediaType: 1,
      },
    ],
  ],
};

export type Inscription = {
  id: string;
  creator: string;
  owner: string;
  sat: number;
  mimeType: string;
  mimeSubtype: string;
  mediaType: string;
  mediaCharset: string;
  mediaSize: number;
  mediaContent: string;
  timestamp: number;
  height: number;
  fee: number;
  genesis: string;
  number: number;
  outpoint: string;
  meta?: any;
  verified?: boolean;
};

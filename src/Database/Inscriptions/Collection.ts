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
        number: 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        sat: 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        mediaKind: 1,
      },
    ],
  ],
};

export type Inscription = {
  id: string;
  owner: string;
  sat: number;
  mediaKind: string;
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
};

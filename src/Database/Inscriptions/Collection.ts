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
  // rome-ignore lint/suspicious/noExplicitAny: reason
  meta?: any;
};

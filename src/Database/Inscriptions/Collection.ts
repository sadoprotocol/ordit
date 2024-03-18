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
        _id: -1,
      },
    ],
    [
      {
        number: 1,
        _id: -1,
      },
    ],
    [
      {
        outpoint: 1,
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
  parent?: string;
  delegate?: string;
  children: string[];
  creator: string;
  owner?: string;
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
  sequence: number;
  outpoint: string;
  ethereum: string;
  ometa?: any;
  meta?: any;
  verified?: boolean;
};

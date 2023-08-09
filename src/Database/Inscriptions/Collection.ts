import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<Inscription>("inscriptions");

export const registrar: CollectionRegistrar = {
  name: "outputs",
  indexes: [
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
  ],
};

export type Inscription = {
  id: string;
  owner: string;
  sat?: number;
  media: InscriptionMedia;
  timestamp: number;
  height: number;
  fee: number;
  genesis: string;
  number: number;
  outpoint: string;
};

type InscriptionMedia = {
  kind: string;
  size: number;
  content: string;
};

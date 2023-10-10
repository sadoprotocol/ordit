import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<SadoDocument>("sado_events");

export const registrar: CollectionRegistrar = {
  name: "sado_events",
  indexes: [[{ cid: 1 }, { unique: true }], [{ addresses: 1 }], [{ height: 1 }]],
};

export type SadoDocument = {
  cid: string;
  type: "order" | "offer" | "collection";
  addresses: string[];
  txid: string;
  height: number;
};

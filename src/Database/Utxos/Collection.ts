import { ScriptPubKey } from "~Services/Bitcoin";
import { CollectionRegistrar, mongo } from "~Services/Mongo";

export const collection = mongo.db.collection<Utxo>("utxos");

export const registrar: CollectionRegistrar = {
  name: "utxos",
  indexes: [
    [
      {
        location: 1,
      },
      {
        unique: true,
      },
    ],
  ],
};

export type Utxo = {
  txid: string;
  n: number;
  sats: number;
  scriptPubKey: ScriptPubKey;
  address: string;
  location: string;
};

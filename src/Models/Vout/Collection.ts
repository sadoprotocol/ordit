import { Vout } from "../../Services/Bitcoin";
import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<VoutDocument>("vout");

export const registrar: CollectionRegistrar = {
  name: "vout",
  indexes: [
    [
      {
        txid: 1,
        n: 1,
      },
      {
        unique: true,
      },
    ],
  ],
};

export type VoutDocument = Vout & {
  blockHash: string;
  blockN: number;
  txid: string;
  sats: number;
  address?: string;
  nextTxid?: string;
  vin?: number;
};

export type SpentVout = {
  vout: {
    txid: string;
    n: number;
  };
  vin: {
    txid: string;
    n: number;
  };
};

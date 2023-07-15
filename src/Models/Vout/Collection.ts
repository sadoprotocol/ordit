import { Vout } from "../../Services/Bitcoin";
import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<VoutDocument>("vout");

export const registrar: CollectionRegistrar = {
  name: "vout",
  indexes: [
    [
      {
        blockN: 1,
      },
    ],
    [
      {
        addressTo: 1,
        txid: 1,
        n: 1,
      },
    ],
    [
      {
        addressTo: 1,
        blockN: -1,
        n: 1,
      },
    ],
    [
      {
        txid: 1,
        n: 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        blockN: -1,
        n: 1,
      },
    ],
    [
      {
        "spent.txid": 1,
        "spent.n": 1,
      },
      {
        unique: true,
        sparse: true,
      },
    ],
  ],
};

export type VoutDocument = Vout & {
  addressTo?: string;
  blockHash: string;
  blockN: number;
  txid: string;
  sats: number;
  spent?: {
    txid: string;
    n: number;
  };
};

export type SpentVout = {
  txid: string;
  vout: number;
  location: {
    txid: string;
    n: number;
  };
};

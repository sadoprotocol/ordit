import { TxVin } from "../../Services/Bitcoin";
import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<VinDocument>("vin");

export const registrar: CollectionRegistrar = {
  name: "vin",
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
    [
      {
        "spending.txid": 1,
        "spending.n": 1,
      },
      {
        unique: true,
      },
    ],
  ],
};

export type VinDocument = TxVin & {
  blockHash: string;
  blockN: number;
  n: number;
  spending: {
    txid: string;
    n: number;
  };
};

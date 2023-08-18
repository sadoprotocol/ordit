import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<OutputDocument>("outputs");

export const registrar: CollectionRegistrar = {
  name: "outputs",
  indexes: [
    [
      {
        addresses: 1,
      },
    ],
    [
      {
        addresses: 1,
        value: 1,
      },
    ],
    [
      {
        "vout.txid": 1,
        "vout.n": 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        "vin.txid": 1,
        "vin.n": 1,
      },
      {
        unique: true,
        sparse: true,
      },
    ],
    [
      {
        "vout.block.height": 1,
      },
    ],
    [
      {
        "vin.block.height": 1,
      },
      {
        sparse: true,
      },
    ],
  ],
};

export type OutputDocument = {
  addresses: string[];
  value: number;
  vout: OutputTransaction;
  vin?: OutputTransaction | null;
};

export type SpentOutput = {
  vout: {
    txid: string;
    n: number;
  };
  vin: OutputTransaction;
};

type OutputTransaction = {
  block: OutputBlock;
  txid: string;
  n: number;
};

type OutputBlock = {
  hash: string;
  height: number;
};

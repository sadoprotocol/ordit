import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<OutputDocument>("outputs");
export const deployedCollection = mongo.deployedDb.collection<OutputDocument>("outputs");

export const registrar: CollectionRegistrar = {
  name: "outputs",
  indexes: [
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
        "vout.block.height": 1,
      },
    ],
  ],
};

export type OutputDocument = {
  addresses: string[];
  value: number;
  vout: OutputTransaction;
  vin?: OutputTransaction;
  spent?: true;
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

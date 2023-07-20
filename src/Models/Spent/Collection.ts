import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<SpentDocument>("spents");

export const registrar: CollectionRegistrar = {
  name: "spents",
  indexes: [
    [
      {
        block: 1,
      },
    ],
    [
      {
        vin: 1,
      },
    ],
    [
      {
        vout: 1,
      },
    ],
  ],
};

export type SpentDocument = {
  block: number;
  vout: string;
  vin: string;
};

import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<SpentDocument>("spents");

export const registrar: CollectionRegistrar = {
  name: "spents",
  indexes: [
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
  vout: string;
  vin: string;
};

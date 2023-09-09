import { CollectionRegistrar, mongo } from "../../../Services/Mongo";

export const collection = mongo.db.collection<SatRange>("ordinal_sat_ranges");

export const registrar: CollectionRegistrar = {
  name: "ordinal_sat_ranges",
  indexes: [
    [
      {
        location: 1,
        first: 1,
        last: 1,
      },
      {
        unique: true,
      },
    ],
    [
      {
        block: 1,
      },
    ],
    [
      {
        location: 1,
      },
    ],
    [
      {
        first: 1,
        last: 1,
      },
    ],
  ],
};

export type SatRange = {
  block: number;
  location: string;
  first: number;
  last: number;
};

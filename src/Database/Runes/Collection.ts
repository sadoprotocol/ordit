import { RunestoneSpec } from "runestone-lib";

import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<RunestoneSpec>("runestones");

export const registrar: CollectionRegistrar = {
  name: "runestones",
  indexes: [
    [
      {
        id: 1,
      },
      {
        unique: true,
      },
    ],
  ],
};

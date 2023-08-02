import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getSadoEntries } from "../../Models/Sado";
import { stripMongoId } from "../../Services/Mongo";

export const getSadoEntriesByAddress = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return getSadoEntries({ addresses: address }, { sort: ["height", "desc"] }).then((docs) => docs.map(stripMongoId));
  },
});

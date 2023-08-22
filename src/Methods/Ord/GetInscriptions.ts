import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";

export const getInscriptions = method({
  params: Schema({
    outpoint: string,
  }),
  handler: async ({ outpoint }) => {
    return db.inscriptions.getInscriptionsByOutpoint(outpoint);
  },
});

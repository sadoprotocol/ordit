import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";

export const getInscription = method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    return db.inscriptions.getInscriptionById(id);
  },
});

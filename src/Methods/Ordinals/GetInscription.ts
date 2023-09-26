import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";

export default method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    const inscription = await db.inscriptions.getInscriptionById(id);
    if (inscription === undefined) {
      throw new NotFoundError("Inscription not found");
    }
    return inscription;
  },
});

import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../../Database";
import { getMetaFromTxId } from "../../../Utilities/Oip";

export default method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    const inscription = await db.inscriptions.findOne({ id });
    if (inscription === undefined) {
      throw new NotFoundError("Inscription not found");
    }
    return getMetaFromTxId(inscription.genesis);
  },
});

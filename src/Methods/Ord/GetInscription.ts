import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "../../Services/Ord";
import { getMetaFromTxId } from "../../Utilities/Oip";

export const getInscription = method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    const inscription = await ord.inscription(id);
    if (inscription === undefined) {
      throw new NotFoundError();
    }
    const meta = await getMetaFromTxId(inscription.genesis);
    if (meta !== undefined) {
      inscription.meta = meta;
    }
    return inscription;
  },
});

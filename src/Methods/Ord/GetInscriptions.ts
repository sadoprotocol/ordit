import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "../../Services/Ord";
import { getMetaFromTxId } from "../../Utilities/Oip";

export const getInscriptions = method({
  params: Schema({
    outpoint: string,
  }),
  handler: async ({ outpoint }) => {
    const data = [];

    const [txid] = outpoint.split(":");

    const inscriptionIds = await ord.inscriptions(outpoint);
    for (const id of inscriptionIds) {
      const inscription = await ord.inscription(id);
      const oipMeta = await getMetaFromTxId(txid);
      if (oipMeta !== undefined) {
        inscription.oipMeta = oipMeta;
      }
      data.push(inscription);
    }

    return data;
  },
});

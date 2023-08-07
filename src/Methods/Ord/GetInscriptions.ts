import { method } from "@valkyr/api";
import Schema, { boolean, string } from "computed-types";

import { config } from "../../Config";
import { ord } from "../../Services/Ord";
import { getMetaFromTxId } from "../../Utilities/Oip";

export const getInscriptions = method({
  params: Schema({
    outpoint: string,
    options: Schema({
      url: boolean.optional(),
    }).optional(),
  }),
  handler: async ({ outpoint, options }) => {
    const data = [];

    const [txid] = outpoint.split(":");

    const inscriptionIds = await ord.inscriptions(outpoint);
    for (const id of inscriptionIds) {
      const inscription = await ord.inscription(id);
      const meta = await getMetaFromTxId(txid);
      if (meta !== undefined) {
        inscription.meta = meta;
      }
      if (options === undefined || options.url === true) {
        inscription.mediaContent = `${config.api.domain}/content/${id}`;
      }
      data.push(inscription);
    }

    return data;
  },
});

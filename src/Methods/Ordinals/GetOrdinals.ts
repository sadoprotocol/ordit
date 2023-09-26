import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { ord } from "../../Services/Ord";

export default method({
  params: Schema({
    address: string.optional(),
    location: string.optional(),
  }),
  handler: async ({ address, location }) => {
    if (location) {
      return ord.getOrdinals(location);
    }
    if (address) {
      const ordinals = [];
      const outputs = await db.outputs.find({ addresses: address, vin: { $exists: false } });
      for (const output of outputs) {
        ordinals.push(...(await ord.getOrdinals(`${output.vout.txid}:${output.vout.n}`)));
      }
      return ordinals;
    }
    return [];
  },
});

import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return await db.outputs.collection.countDocuments({
      addresses: address,
      ...noSpentsFilter,
    });
  },
});

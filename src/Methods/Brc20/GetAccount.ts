import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { decodeTick } from "../../Database/Brc20/Utilities";
import { stripMongoId } from "../../Services/Mongo";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    const result = await db.brc20.accounts.getAccount(address);
    if (!result) {
      throw new NotFoundError({ address });
    }
    for (const tick in result.tokens) {
      (result as any).tokens[decodeTick(tick)] = (result as any).tokens[tick];
      delete (result as any).tokens[tick];
    }
    return stripMongoId(result);
  },
});

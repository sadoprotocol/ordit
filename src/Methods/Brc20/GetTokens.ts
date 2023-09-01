import { method } from "@valkyr/api";
import Schema from "computed-types";

import { db } from "../../Database";
import { decodeTick } from "../../Database/Brc20/Utilities";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    sort: schema.sort.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ sort = {}, pagination = {} }) => {
    const result = await db.brc20.tokens.findPaginated({
      ...pagination,
      sort,
      transform: (document) => {
        document.tick = decodeTick(document.tick);
      },
    });
    return {
      tokens: result.documents,
      pagination: result.pagination,
    };
  },
});

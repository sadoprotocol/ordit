import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    filter: Schema({
      creator: string.optional(),
      owner: string.optional(),
      mimeType: string.optional(),
      mimeSubtype: string.optional(),
      outpoint: string.optional(),
    }).optional(),
    sort: schema.sort.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ filter = {}, sort = {}, pagination = {} }) => {
    const result = await db.inscriptions.findPaginated({
      ...pagination,
      filter,
      sort,
      transform: (inscription) => {
        inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
      },
    });
    return {
      inscriptions: result.documents,
      pagination: result.pagination,
    };
  },
});

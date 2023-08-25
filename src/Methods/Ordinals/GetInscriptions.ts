import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { config } from "../../Config";
import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { schema } from "../../Libraries/Schema";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getPagination, pagination } from "../../Utilities/Pagination";

export default method({
  params: Schema({
    owner: string.optional(),
    type: string.optional(),
    subtype: string.optional(),
    outpoint: string.optional(),
    sort: Schema({
      number: schema.sort,
    }).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ owner, type, subtype, outpoint, sort, pagination }) => {
    const filter: Filter<Inscription> = {};
    const limit = pagination?.limit ?? 10;

    if (owner !== undefined) {
      filter.owner = owner;
    }

    if (type !== undefined) {
      filter.mimeType = type;
    }

    if (subtype !== undefined) {
      filter.mimeSubtype = subtype;
    }

    if (outpoint !== undefined) {
      filter.outpoint = outpoint;
    }

    const inscriptions = await db.inscriptions.find(filter ?? {}, {
      sort: { number: sort?.number === "asc" ? 1 : -1 },
      ...getPagination(pagination),
    });

    for (const inscription of inscriptions) {
      delete (inscription as any)._id;
      inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
      const meta = await getMetaFromTxId(inscription.genesis);
      if (meta !== undefined) {
        inscription.meta = meta;
      }
    }

    return {
      inscriptions: inscriptions.map((inscription) => {
        delete (inscription as any)._id;
        return {
          ...inscription,
          mediaContent: `${config.api.domain}/content/${inscription.id}`,
        };
      }),
      pagination: {
        page: pagination?.page ?? 1,
        limit,
        total: await db.inscriptions.count(filter ?? {}),
      },
    };
  },
});

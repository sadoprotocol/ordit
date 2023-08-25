import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";
import { Filter, ObjectId } from "mongodb";

import { config } from "../../Config";
import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { schema } from "../../Libraries/Schema";

export default method({
  params: Schema({
    owner: string.optional(),
    type: string.optional(),
    subtype: string.optional(),
    outpoint: string.optional(),
    sort: Schema({
      number: schema.sort,
    }).optional(),
    pagination: Schema({
      limit: number.max(100).optional(),
      from: string.optional(),
    }).optional(),
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

    if (pagination?.from !== undefined) {
      filter._id = {
        $lt: new ObjectId(pagination.from),
      };
    }

    const inscriptions = await db.inscriptions.find(filter ?? {}, {
      sort: { number: sort?.number === "asc" ? 1 : -1 },
      limit,
    });

    const next = inscriptions.length > limit ? inscriptions[inscriptions.length - 1]._id : null;

    return {
      inscriptions: inscriptions.map((inscription) => {
        delete (inscription as any)._id;
        return {
          ...inscription,
          mediaContent: `${config.api.domain}/content/${inscription.id}`,
        };
      }),
      pagination: {
        limit,
        next,
      },
    };
  },
});

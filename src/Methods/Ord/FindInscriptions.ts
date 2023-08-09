import { method } from "@valkyr/api";
import Schema, { number, string } from "computed-types";
import { Filter, ObjectId } from "mongodb";

import { config } from "../../Config";
import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";

export const findInscriptions = method({
  params: Schema({
    type: string.optional(),
    subtype: string.optional(),
    pagination: Schema({
      limit: number.max(100).optional(),
      from: string.optional(),
    }).optional(),
  }),
  handler: async ({ type, subtype, pagination }) => {
    const filter: Filter<Inscription> = {};

    if (number !== undefined) {
      filter.number = number;
    }

    if (type !== undefined) {
      filter.mimeType = type;
    }

    if (subtype !== undefined) {
      filter.mimeSubtype = subtype;
    }

    if (pagination?.from !== undefined) {
      filter._id = {
        $gt: new ObjectId(pagination.from),
      };
    }

    const inscriptions = await db.inscriptions.find(filter ?? {}, {
      sort: {
        number: -1,
      },
      limit: pagination?.limit ?? 10,
    });

    const next = inscriptions[inscriptions.length - 1]._id;

    return {
      inscriptions: inscriptions.map((inscription) => {
        // delete (inscription as any)._id;
        return {
          ...inscription,
          mediaContent: `${config.api.domain}/content/${inscription.id}`,
        };
      }),
      next,
    };
  },
});

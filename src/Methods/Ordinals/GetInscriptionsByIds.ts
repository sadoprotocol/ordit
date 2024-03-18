import { method } from "@valkyr/api";
import Schema, { array, string } from "computed-types";

import { config } from "~Config";
import { db } from "~Database";

export default method({
  params: Schema({
    ids: array.of(string),
  }),
  handler: async ({ ids }) => {
    const inscriptions = await db.inscriptions.find({ id: { $in: ids } }).then((inscriptions) => {
      return inscriptions.map((inscription) => {
        delete (inscription as any)._id;
        inscription.mediaContent = `${config.api.uri}/content/${inscription.id}`;
        return inscription;
      });
    });

    return db.inscriptions.fillDelegateInscriptions(inscriptions)
  },
});

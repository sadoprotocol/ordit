import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "~Database";
import { getGeniiGenesisIds } from "~Database/Data/GeniiGenesis.ts";
import { getOrdzaarPassIds } from "~Database/Data/OrdzaarPass.ts";

/**
 * Returns true if the address owns any one of the inscriptions from the collection.
 * Currently, supports:
 * - ordzaarpass
 * - genesis
 */
export default method({
  params: Schema({
    address: string,
    collectionId: string,
  }),
  handler: async ({ address, collectionId }) => {
    let inscriptionIds: string[] = []
    switch (collectionId) {
      case "ordzaarpass":
        inscriptionIds = getOrdzaarPassIds()
        break
      case "genesis":
        inscriptionIds = getGeniiGenesisIds()
        break
    }
    if (inscriptionIds.length === 0) {
      throw new Error(`Collection ${collectionId} not found`)
    }

    const result = await db.inscriptions.findOne({owner: address, id: {$in: inscriptionIds}});
    return {
      isHolder: !!result,
    }
  },
});
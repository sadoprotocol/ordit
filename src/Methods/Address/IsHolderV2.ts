import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "~Database";
import { getFeelingGood } from "~Database/Data/FeelingGood.ts";
import { getFomoji_2Ids } from "~Database/Data/Fomoji2.ts";
import { getFomojiGenesisIds } from "~Database/Data/FomojiGenesis.ts";
import { getGeniiGenesisIds } from "~Database/Data/GeniiGenesis.ts";
import { getOrdzaarPassIds } from "~Database/Data/OrdzaarPass.ts";
import { getUnisatOGPass } from "~Database/Data/UnisatOGPass.ts";

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
      case "feeling-good":
        inscriptionIds = getFeelingGood()
        break
      case "unisat-og-pass":
        inscriptionIds = getUnisatOGPass()
        break
      case "ordinal-fomojis":
        inscriptionIds = getFomojiGenesisIds()
        break
      case "fomojis_2":
        inscriptionIds = getFomoji_2Ids()
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
import { method } from "@valkyr/api";
import Schema, { array, string } from "computed-types";

import { db } from "../../Database";

/**
 * Returns true if the address owns any one of the inscriptions from inscriptionIds
 */
export default method({
    params: Schema({
        address: string,
        inscriptionIds: array.of(string),
    }),
    handler: async ({ address, inscriptionIds}) => {
        const result = await db.inscriptions.findOne({owner: address, id: {$in: inscriptionIds}});
        return !!result;
    },
});

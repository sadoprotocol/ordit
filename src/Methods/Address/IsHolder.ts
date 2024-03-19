import { method } from "@valkyr/api";
import Schema, { array, string } from "computed-types";

import { db } from "../../Database";

/**
 * Returns true if the address owns any one of the inscriptions from inscriptionList
 */
export default method({
    params: Schema({
        address: string,
        inscriptionList: array.of(string),
    }),
    handler: async ({ address, inscriptionList}) => {
        const result = await db.inscriptions.findOne({owner: address, id: {$in: inscriptionList}});
        return !!result;
    },
});

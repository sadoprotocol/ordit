import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { schema } from "../../Libraries/Schema";
import { getExpandedTransaction, parseLocation } from "../../Utilities/Transaction";
import { rpc } from "~Services/Bitcoin";

export default method({
  params: Schema({
    filter: Schema({
      owner: string.optional(),
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
        inscription.mediaContent = `${config.api.uri}/content/${inscription.id}`;
      },
    });
    // get transactions
    const inscriptionsWithTransactions = await Promise.all(
      result.documents.map(async (inscription) => {
        const [txid] = parseLocation(inscription.outpoint);
        const tx = await rpc.transactions.getRawTransaction(txid, true);
        const expandedTx = await getExpandedTransaction(tx);
        return {
          ...inscription,
          transaction: expandedTx,
        };
      }),
    );

    return {
      inscriptions: inscriptionsWithTransactions,
      pagination: result.pagination,
    };
  },
});

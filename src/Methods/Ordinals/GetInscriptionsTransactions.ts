import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { limiter } from "~Libraries/Limiter";
import { rpc } from "~Services/Bitcoin";

import { config } from "../../Config";
import { db } from "../../Database";
import { schema } from "../../Libraries/Schema";
import { getExpandedTransaction, parseLocation } from "../../Utilities/Transaction";

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
    const promiseLimiter = limiter<any>(10);

    result.documents = await db.inscriptions.fillDelegateInscriptions(result.documents)
    result.documents.forEach((inscription) => {
      promiseLimiter.push(async () => {
        const [txid] = parseLocation(inscription.outpoint);
        const tx = await rpc.transactions.getRawTransaction(txid, true);
        const expandedTx = await getExpandedTransaction(tx);
        return {
          ...inscription,
          transaction: expandedTx,
        };
      });
    });

    const inscriptionsWithTransactions = await promiseLimiter.run();

    return {
      inscriptions: inscriptionsWithTransactions,
      pagination: result.pagination,
    };
  },
});

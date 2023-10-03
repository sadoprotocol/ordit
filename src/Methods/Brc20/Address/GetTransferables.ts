import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";
import { Filter } from "mongodb";

import { db } from "../../../Database";
import { Token } from "../../../Database/Brc20/Tokens/Collection";
import { TokenTransfer } from "../../../Database/Brc20/Transfers/Collection";
import { getLocationFromId } from "../../../Libraries/Inscriptions/Utilities";
import { schema } from "../../../Libraries/Schema";

export default method({
  params: Schema({
    address: string,
    tick: string.optional(),
    include: schema.include("token"),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ address, tick, include, pagination }) => {
    const filter: Filter<TokenTransfer> = { "from.address": address, to: null };
    if (tick) {
      filter.slug = tick.toLowerCase();
    }
    const result = await db.brc20.transfers.findPaginated({
      ...pagination,
      filter,
      transform: (transfer) => {
        const [txid, n] = getLocationFromId(transfer.inscription);
        (transfer.from as any).txid = txid;
        (transfer.from as any).vout = n;
      },
    });
    if (include?.includes("token")) {
      result.documents = await includeTokenData(result.documents);
    }
    return {
      transferables: result.documents,
      pagination: result.pagination,
    };
  },
});

async function includeTokenData(transfers: TokenTransfer[]): Promise<WithTokenData[]> {
  const data = await db.brc20.tokens.find({ slug: { $in: transfers.map((transfer) => transfer.slug) } });
  return transfers.map((transfer) => {
    const token = data.find((token) => token.slug === transfer.slug);
    if (token) {
      return {
        ...transfer,
        token: {
          inscription: token.inscription,
          max: token.max,
          amount: token.amount,
          limit: token.limit,
          decimal: token.decimal,
          creator: token.creator,
          timestamp: token.timestamp,
        },
      };
    }
    return token;
  }) as WithTokenData[];
}

type WithTokenData = TokenTransfer & { token: Token; $cursor: string };

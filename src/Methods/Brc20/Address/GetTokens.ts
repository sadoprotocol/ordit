import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../../Database";
import { TokenHolder } from "../../../Database/Brc20/Holders/Collection";
import { Token } from "../../../Database/Brc20/Tokens/Collection";
import { schema } from "../../../Libraries/Schema";
import { stripMongoIdFromMany } from "../../../Services/Mongo";

export default method({
  params: Schema({
    address: string,
    include: schema.include("token"),
  }),
  handler: async ({ address, include }) => {
    let tokens = await db.brc20.holders.getTokens(address).then(stripMongoIdFromMany);
    if (include?.includes("token")) {
      tokens = await includeTokenData(tokens);
    }
    return tokens;
  },
});

async function includeTokenData(tokens: TokenHolder[]): Promise<WithTokenData[]> {
  const data = await db.brc20.tokens.find({ slug: { $in: tokens.map((token) => token.slug) } });
  return tokens.map((holder) => {
    const token = data.find((token) => token.slug === holder.slug);
    if (token) {
      return {
        ...holder,
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

type WithTokenData = TokenHolder & { token: Token };

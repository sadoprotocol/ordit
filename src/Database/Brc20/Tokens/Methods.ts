import { CountDocumentsOptions, Filter, FindOptions } from "mongodb";

import { FindPaginatedParams, paginate } from "../../../Libraries/Paginate";
import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import type { TokenDeployed } from "../Events/Collection";
import { collection, Token } from "./Collection";

export const tokens = {
  collection,
  deploy,
  find,
  findOne,
  findPaginated,
  count,
  addTokenBalance,
};

/**
 * Create a new token.
 *
 * @remarks This method ignores any duplicate token registrations. First
 * come first serve.
 *
 * @param event - Token deployed event.
 */
async function deploy(event: TokenDeployed) {
  return collection
    .insertOne({
      inscription: event.meta.inscription,
      tick: event.tick,
      slug: event.tick.toLowerCase(),
      max: event.max,
      amount: 0,
      limit: event.lim ?? null,
      decimal: event.dec,
      creator: event.meta.address,
      timestamp: event.meta.timestamp,
    })
    .catch(ignoreDuplicateErrors);
}

/**
 * Find token by filter.
 *
 * @param filter  - MongoDb filter.
 * @param options - MongoDb find options to pass to the find method.
 */
async function find(filter: Filter<Token>, options?: FindOptions<Token>) {
  return collection.find(filter, options).toArray();
}

/**
 * Find a token by filter.
 *
 * @param filter  - MongoDb filter.
 * @param options - MongoDb find options to pass to the findOne method.
 */
async function findOne(filter: Filter<Token>, options?: FindOptions<Token>) {
  const token = await collection.findOne(filter, options);
  if (token === null) {
    return undefined;
  }
  return token;
}

/**
 * Execute a paginated find query.
 *
 * @param params - Pagination params.
 */
async function findPaginated(params: FindPaginatedParams<Token> = {}) {
  return paginate.findPaginated(collection, params);
}

/**
 * Get token count by filter.
 *
 * @param filter  - MongoDb filter.
 * @param options - MongoDb count options to pass to the countDocuments method.
 */
async function count(filter: Filter<Token>, options?: CountDocumentsOptions) {
  return collection.countDocuments(filter, options);
}

/**
 * Adjust the balance of a token.
 *
 * @param tick   - Token tick to set the balance of.
 * @param amount - Amount to adjust the balance by, can be negative.
 */
async function addTokenBalance(tick: string, amount: number) {
  return collection.updateOne({ tick }, { $inc: { amount } });
}

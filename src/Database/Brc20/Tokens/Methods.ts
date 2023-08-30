import { Filter, FindOptions } from "mongodb";

import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import { Inscription } from "../../Inscriptions";
import { TokenDeployedEvent } from "../Utilities";
import { collection, Token } from "./Collection";

export const tokens = {
  collection,
  deploy,
  findOne,
  addTokenBalance,
};

/**
 * Create a new token.
 *
 * @remarks This method ignores any duplicate token registrations. First
 * come first serve.
 *
 * @param event       - Token deployed event.
 * @param inscription - Inscription the token was created under.
 */
async function deploy(event: TokenDeployedEvent, inscription: Inscription) {
  const token: Token = {
    inscription: inscription.id,
    address: inscription.owner,
    tick: event.tick,
    max: event.max,
    minted: 0,
  };
  if (event.lim !== undefined) {
    token.lim = event.lim;
  }
  return collection.insertOne(token).catch(ignoreDuplicateErrors);
}

/**
 * Find a token by filter.
 *
 * @param filter  - MongoDb filter.
 * @param options - MongoDb find options to pass to the find method.
 */
async function findOne(filter: Filter<Token>, options?: FindOptions<Token>) {
  const token = await collection.findOne(filter, options);
  if (token === null) {
    return undefined;
  }
  return token;
}

/**
 * Adjust the balance of a token.
 *
 * @param tick   - Token tick to set the balance of.
 * @param amount - Amount to adjust the balance by, can be negative.
 */
async function addTokenBalance(tick: string, amount: number) {
  return collection.updateOne({ tick }, { $inc: { minted: amount } });
}

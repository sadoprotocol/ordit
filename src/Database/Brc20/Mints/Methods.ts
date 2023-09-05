import Big from "big.js";
import { Filter, FindOptions, UpdateFilter } from "mongodb";

import { Inscription } from "../../Inscriptions";
import { TokenMintedEvent } from "../Events/Events";
import { holders } from "../Holders/Methods";
import { tokens } from "../Tokens/Methods";
import { collection, Mint } from "./Collection";

export const mints = {
  collection,
  findOne,
  updateOne,
  mint,
};

async function findOne(filter: Filter<Mint>, options?: FindOptions<Mint>) {
  const token = await collection.findOne(filter, options);
  if (token === null) {
    return undefined;
  }
  return token;
}

async function updateOne(filter: Filter<Mint>, update: UpdateFilter<Mint> | Partial<Mint>) {
  return collection.updateOne(filter, update);
}

/**
 * Handle mint event for a token.
 *
 * @param event       - Mint event.
 * @param inscription - Inscription the mint was created under.
 */
async function mint(event: TokenMintedEvent, inscription: Inscription) {
  const token = await tokens.findOne({ tick: event.tick });
  if (token === undefined) {
    return;
  }

  if (token.max === token.amount) {
    return; // token has been fully minted
  }

  if (token.limit !== null && event.amt > token.limit) {
    return; // requested amount exceeds the defined limit
  }

  const available = new Big(token.max).minus(token.amount).toNumber();
  if (event.amt > available) {
    event.amt = available; // if amount is larger than requested, deliver the remainder
  }

  const mint = await collection.findOne({ inscription: inscription.id });
  if (mint !== null) {
    return; // a mint can only occur once
  }

  await collection.insertOne({
    inscription: inscription.id,
    tick: event.tick,
    slug: event.tick.toLocaleLowerCase(),
    amount: event.amt,
    minter: inscription.creator,
    timestamp: inscription.timestamp,
  });

  // ### Update Balances

  await tokens.addTokenBalance(event.tick, event.amt);
  await holders.addAvailableBalance(inscription.creator, event.tick, event.amt);
}

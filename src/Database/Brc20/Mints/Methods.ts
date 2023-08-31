import Big from "big.js";
import { Filter, FindOptions, UpdateFilter } from "mongodb";

import { Inscription } from "../../Inscriptions";
import { accounts } from "../Accounts/Methods";
import { tokens } from "../Tokens/Methods";
import { TokenMintedEvent } from "../Utilities";
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

  if (token.limit !== null && event.amt > token.limit) {
    return;
  }

  const available = new Big(token.max).minus(token.amount).toNumber();
  if (event.amt > available) {
    return;
  }

  const mint = await collection.findOne({ inscription: inscription.id });
  if (mint !== null) {
    return; // a mint can only occur once
  }

  await collection.insertOne({
    inscription: inscription.id,
    tick: event.tick,
    amount: event.amt,
    minter: inscription.creator,
    timestamp: inscription.timestamp,
  });

  // ### Update Balances

  await tokens.addTokenBalance(event.tick, event.amt);
  await accounts.addAvailableBalance(inscription.creator, event.tick, event.amt);
}

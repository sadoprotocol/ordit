import { Filter, FindOptions, UpdateFilter } from "mongodb";

import { log } from "../../../Workers/Log";
import { Inscription } from "../../Inscriptions";
import { tokens } from "../Tokens/Methods";
import { TokenMintedEvent } from "../Utilities";
import { collection, Mint } from "./Collection";

export const mints = {
  findOne,
  updateOne,

  // ### Indexer Methods

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

async function mint(event: TokenMintedEvent, inscription: Inscription) {
  const token = await tokens.findOne({ tick: event.tick });
  if (token === undefined) {
    return log(`  🚫 token with ${event.tick} does not exist\n`);
  }

  if (token.lim !== undefined && token.lim < event.amt) {
    return log(`  🚫 mint amount exceeds limit\n`);
  }

  const available = token.max - token.balance;
  if (event.amt < available) {
    return log(`  🚫 not enough available balance\n`);
  }

  await collection.updateOne(
    {
      address: inscription.creator,
    },
    {
      $set: {
        address: inscription.creator,
        tick: event.tick,
      },
      $inc: {
        balance: event.amt,
      },
    },
    {
      upsert: true,
    }
  );

  await tokens.updateOne({ tick: event.tick }, { $inc: { balance: event.amt } });
}

import { Filter, FindOptions, UpdateFilter } from "mongodb";

import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import { log } from "../../../Workers/Log";
import { Inscription } from "../../Inscriptions";
import { TokenDeployedEvent } from "../Utilities";
import { collection, Token } from "./Collection";

export const tokens = {
  findOne,
  updateOne,

  // ### Indexer Methods

  deploy,
};

async function findOne(filter: Filter<Token>, options?: FindOptions<Token>) {
  const token = await collection.findOne(filter, options);
  if (token === null) {
    return undefined;
  }
  return token;
}

async function updateOne(filter: Filter<Token>, update: UpdateFilter<Token> | Partial<Token>) {
  return collection.updateOne(filter, update);
}

async function deploy(event: TokenDeployedEvent, inscription: Inscription) {
  const token: Token = {
    id: inscription.id,
    address: inscription.owner,
    tick: event.tick,
    max: event.max,
    balance: 0,
  };
  if (event.lim !== undefined) {
    token.lim = event.lim;
  }
  await collection
    .insertOne(token)
    .then(() => {
      log(`  👌 deployed\n`);
    })
    .catch(ignoreDuplicateErrors);
}

import { Filter, FindOptions } from "mongodb";

import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, Inscription } from "./Collection";

export const inscriptions = {
  collection,

  // ### Core Methods

  insertMany,
  find,
  findOne,
  count,
};

/*
 |--------------------------------------------------------------------------------
 | Core Methods
 |--------------------------------------------------------------------------------
 |
 | Flexible core mongodb methods for the collection. These methods provides a 
 | unified passthrough to the collection directly for querying.
 |
 */

async function insertMany(inscriptions: Inscription[], chunkSize = 1000) {
  const promises = [];
  for (let i = 0; i < inscriptions.length; i += chunkSize) {
    const chunk = inscriptions.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function find(filter: Filter<Inscription>, options?: FindOptions<Inscription>) {
  return collection.find(filter, options).toArray();
}

async function findOne(
  filter: Filter<Inscription>,
  options?: FindOptions<Inscription>
): Promise<Inscription | undefined> {
  const output = await collection.findOne(filter, options);
  if (output === null) {
    return undefined;
  }
  return output;
}

async function count(filter: Filter<Inscription>) {
  return collection.countDocuments(filter);
}

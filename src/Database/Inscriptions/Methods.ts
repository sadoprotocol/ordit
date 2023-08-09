import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, Inscription } from "./Collection";

export const inscriptions = {
  collection,

  // ### Core Methods

  insertMany,
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

import { Filter, FindOptions, UpdateFilter } from "mongodb";

import { config } from "../../Config";
import { FindPaginatedParams, paginate } from "../../Libraries/Paginate";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection, Inscription } from "./Collection";

export const inscriptions = {
  collection,

  // ### Core Methods

  insertMany,
  insertOne,
  find,
  findPaginated,
  findOne,
  updateOne,
  count,

  // ### Helper Methods

  hasInscriptions,
  getInscriptionById,
  getInscriptionsByOutpoint,

  // ### Indexer Methods

  addTransfers,
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

async function insertMany(inscriptions: Inscription[], chunkSize = 500) {
  const promises = [];
  for (let i = 0; i < inscriptions.length; i += chunkSize) {
    const chunk = inscriptions.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function insertOne(inscription: Inscription) {
  return collection.updateOne({ id: inscription.id }, { $set: inscription }, { upsert: true });
}

async function find(filter: Filter<Inscription>, options?: FindOptions<Inscription>) {
  return collection.find(filter, options).toArray();
}

async function findPaginated(params: FindPaginatedParams<Inscription> = {}) {
  return paginate.findPaginated(collection, params);
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

async function updateOne(filter: Filter<Inscription>, update: UpdateFilter<Inscription> | Partial<Inscription>) {
  return collection.updateOne(filter, update);
}

async function count(filter: Filter<Inscription>) {
  return collection.countDocuments(filter);
}

/*
 |--------------------------------------------------------------------------------
 | Helper Methods
 |--------------------------------------------------------------------------------
 |
 | List of helper methods for querying more complex data from the collection. 
 | These methods provides a wrapper around core functionality and produces results 
 | under deterministic filters.
 |
 */

async function hasInscriptions(txid: string, n: number) {
  return (await collection.countDocuments({ outpoint: `${txid}:${n}` })) > 0;
}

async function getInscriptionById(id: string) {
  const inscription = await collection.findOne({ id });
  if (inscription === null) {
    return undefined;
  }
  inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
  return inscription;
}

async function getInscriptionsByOutpoint(outpoint: string) {
  const inscriptions = await collection.find({ outpoint }).toArray();
  for (const inscription of inscriptions) {
    inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
  }
  return inscriptions;
}

/*
 |--------------------------------------------------------------------------------
 | Indexer Methods
 |--------------------------------------------------------------------------------
 |
 | Methods used by indexing operations to update collection states.
 |
 */

async function addTransfers(spents: { id: string; owner: string; outpoint: string }[], chunkSize = 1000) {
  if (spents.length === 0) {
    return;
  }

  const bulkops: any[][] = new Array(Math.ceil(spents.length / chunkSize)).fill(0).map(() => []);

  let i = 0;
  for (const { id, owner, outpoint } of spents) {
    bulkops[i].push({
      updateOne: {
        filter: { id },
        update: {
          $set: { owner, outpoint },
        },
      },
    });
    if (bulkops[i].length % chunkSize === 0) {
      i += 1;
    }
  }

  await Promise.all(bulkops.map((ops) => collection.bulkWrite(ops)));
}

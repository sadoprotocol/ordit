import { DeleteOptions, Filter, FindOptions, UpdateFilter } from "mongodb";

import { getChunkSize } from "~Database/Utilities";

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
  deleteMany,

  // ### Helper Methods

  hasInscriptions,
  getInscriptionById,
  getInscriptionsByOutpoint,
  fillDelegateInscriptions,

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

async function insertMany(inscriptions: Inscription[], chunkSize = getChunkSize()) {
  const promises = [];
  for (let i = 0; i < inscriptions.length; i += chunkSize) {
    const chunk = inscriptions.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));

    // Check for parents in Inscriptions and update children
    for (const inscription of chunk) {
      if (inscription.parents) {
        for (const parent of inscription.parents) {
          promises.push(collection.updateOne({ id: parent }, { $addToSet: { children: inscription.id } }));
        }
      }
    }
  }
  await Promise.all(promises);
}

async function insertOne(inscription: Inscription) {
  // Check for parents in Inscriptions and update children
  if (inscription.parents) {
    for (const parent of inscription.parents) {
      await collection.updateOne({ id: parent }, { $addToSet: { children: inscription.id } });
    }
  }
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
  options?: FindOptions<Inscription>,
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

async function deleteMany(filter: Filter<Inscription>, options?: DeleteOptions) {
  return collection.deleteMany(filter, options);
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
  inscription.mediaContent = `${config.api.uri}/content/${inscription.id}`;
  return (await fillDelegateInscriptions([inscription]))[0];
}

async function getInscriptionsByOutpoint(outpoint: string) {
  const inscriptions = await collection.find({ outpoint }).toArray();
  for (const inscription of inscriptions) {
    inscription.mediaContent = `${config.api.uri}/content/${inscription.id}`;
  }
  return await fillDelegateInscriptions(inscriptions);
}

async function fillDelegateInscriptions<T>(inscriptions: T & Inscription[]) {
  const delegateIds = inscriptions
    .filter((inscription) => inscription.delegate)
    .map((inscription) => inscription.delegate!);

  if (delegateIds.length < 1) {
    return inscriptions;
  }

  const delegateInscriptions = await collection
    .find({ id: { $in: delegateIds } })
    .limit(delegateIds.length)
    .toArray();

  if (delegateInscriptions.length < 1) {
    return inscriptions;
  }

  const inscriptionMap = new Map(delegateInscriptions.map((inscription) => [inscription.id, inscription]));

  for (let i = 0; i < inscriptions.length; i += 1) {
    if (!inscriptions[i].delegate) {
      continue;
    }

    const data = inscriptionMap.get(inscriptions[i].delegate!);
    if (data) {
      inscriptions[i].mimeType = data.mimeType;
      inscriptions[i].mimeSubtype = data.mimeSubtype;
      inscriptions[i].mediaType = data.mediaType;
      inscriptions[i].mediaCharset = data.mediaCharset;
      inscriptions[i].mediaSize = data.mediaSize;
    }
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

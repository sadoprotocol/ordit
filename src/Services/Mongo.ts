import { CreateIndexesOptions, Document, IndexSpecification, MongoClient } from "mongodb";

import { config } from "../Config";

const client = new MongoClient(getMongoUri());

export const mongo = {
  get db() {
    return client.db(config.mongo.database);
  },
  register,
  connect,
  collection,
};

/**
 * Register collection and indexes that has not yet been created.
 *
 * @param collections - Collections to register.
 */
async function register(registrars: CollectionRegistrar[]) {
  const list = await getCollectionsSet();
  for (const { name, indexes } of registrars) {
    if (list.has(name) === true) {
      continue;
    }
    await client.db(config.mongo.database).createCollection(name);
    for (const [indexSpec, options] of indexes) {
      await mongo.db.collection(name).createIndex(indexSpec, options);
      console.log("collection '%s' is indexed [%O] with options %O", name, indexSpec, options ?? {});
    }
    console.log("collection '%s' is registered", name);
  }
}

/**
 * Establishes a connection to the mongodb server and keeps it alive.
 */
async function connect() {
  console.log(`connecting to mongodb server ${getMongoUri()}`);
  await client
    .connect()
    .then(() => {
      console.log("client connected");
    })
    .catch((err) => {
      console.log("client failed connection attempt %O", err);
    });
}

/**
 * Get a mongodb collection to perform query operations on.
 *
 * @param name - Name of the collection.
 */
function collection<T extends Document>(name: string) {
  return mongo.db.collection<T>(name);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export function stripMongoIdFromMany<T>(documents: T[]): Omit<T, "_id">[] {
  for (const document of documents) {
    delete (document as any)._id;
  }
  return documents;
}

export function stripMongoId<T>(doc: T): Omit<T, "_id"> {
  delete (doc as any)._id;
  return doc;
}

function getMongoUri() {
  const { hostname, port, username, password } = config.mongo;
  if (username && password) {
    return `mongodb://${username}:${password}@${hostname}:${port}`;
  }
  return `mongodb://${hostname}:${port}`;
}

async function getCollectionsSet() {
  return client
    .db(config.mongo.database)
    .listCollections()
    .toArray()
    .then((collections) => new Set(collections.map((c) => c.name)));
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type CollectionRegistrar = {
  name: string;
  indexes: [IndexSpecification, CreateIndexesOptions?][];
};

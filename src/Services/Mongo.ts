import { CreateIndexesOptions, Document, IndexSpecification, MongoClient } from "mongodb";

import { config } from "../Config";

const client = new MongoClient(getMongoUri(config.mongo));
const deployedClient = new MongoClient(getMongoUri(config.deployedMongo));

export const mongo = {
  get db() {
    return client.db(config.mongo.database);
  },
  get deployedDb() {
    return deployedClient.db(config.deployedMongo.database);
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
  console.log(`connecting to mongodb server ${getMongoUri(config.mongo)}`);
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

function getMongoUri(mongoConfig: {
  hostname: string;
  port: number;
  database: string;
  username: string;
  password: string;
  srvConnection: boolean;
  directConnection: boolean;
}) {
  const { hostname, port, username, password, srvConnection, directConnection } = mongoConfig;

  const options = directConnection ? "?directConnection=true" : "";
  let srv = "";
  let portStr = `:${port}`;
  if (srvConnection) {
    srv = "+srv";
    portStr = "";
  }

  if (username && password) {
    return `mongodb${srv}://${username}:${password}@${hostname}${portStr}${options}`;
  }
  return `mongodb${srv}://${hostname}${portStr}${options}`;
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

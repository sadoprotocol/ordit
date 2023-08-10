import { Filter, FindOptions } from "mongodb";

import { collection, IPFSDocument } from "./Collection";

export const ipfs = {
  insertOne,
  findOne,
};

async function insertOne(document: IPFSDocument): Promise<void> {
  await collection.updateOne({ cid: document.cid }, { $set: document }, { upsert: true });
}

async function findOne(
  filter: Filter<IPFSDocument>,
  options?: FindOptions<IPFSDocument>
): Promise<IPFSDocument | undefined> {
  const document = await collection.findOne(filter, options);
  if (document === null) {
    return undefined;
  }

  if ("_id" in document) {
    const { _id, ...doc } = document;
    return doc;
  }

  return document;
}

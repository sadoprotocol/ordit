import { DeleteOptions, Filter, FindOptions, UpdateFilter } from "mongodb";
import { RunestoneSpec } from "runestone-lib";

import { getChunkSize } from "~Database/Utilities";

import { FindPaginatedParams, paginate } from "../../Libraries/Paginate";
import { ignoreDuplicateErrors } from "../../Utilities/Database";
import { collection } from "./Collection";

export const runestones = {
  collection,
  insertMany,
  insertOne,
  find,
  findPaginated,
  findOne,
  updateOne,
  count,
  deleteMany,
};

async function insertMany(runestones: RunestoneSpec[], chunkSize = getChunkSize(runestones.length)) {
  const promises = [];
  for (let i = 0; i < runestones.length; i += chunkSize) {
    const chunk = runestones.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function insertOne(runestone: RunestoneSpec) {
  return collection.updateOne({ id: runestone }, { $set: runestone }, { upsert: true });
}

async function find(filter: Filter<RunestoneSpec>, options?: FindOptions<RunestoneSpec>) {
  return collection.find(filter, options).toArray();
}

async function findPaginated(params: FindPaginatedParams<RunestoneSpec> = {}) {
  return paginate.findPaginated(collection, params);
}

async function findOne(
  filter: Filter<RunestoneSpec>,
  options?: FindOptions<RunestoneSpec>,
): Promise<RunestoneSpec | undefined> {
  const output = await collection.findOne(filter, options);
  if (output === null) {
    return undefined;
  }
  return output;
}

async function updateOne(filter: Filter<RunestoneSpec>, update: UpdateFilter<RunestoneSpec> | Partial<RunestoneSpec>) {
  return collection.updateOne(filter, update);
}

async function count(filter: Filter<RunestoneSpec>) {
  return collection.countDocuments(filter);
}

async function deleteMany(filter: Filter<RunestoneSpec>, options?: DeleteOptions) {
  return collection.deleteMany(filter, options);
}

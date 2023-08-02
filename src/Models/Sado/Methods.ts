import { Filter, FindOptions } from "mongodb";

import { collection, SadoDocument } from "./Collection";

export async function addSado(sado: SadoDocument) {
  await collection.updateOne({ cid: sado.cid }, { $set: sado }, { upsert: true });
}

export async function getSadoEntries(filter: Filter<SadoDocument>, options?: FindOptions<SadoDocument>) {
  return collection.find(filter, options).toArray();
}

export async function getSadoEntry(filter: Filter<SadoDocument>, options?: FindOptions<SadoDocument>) {
  const document = await collection.findOne(filter, options);
  if (document === null) {
    return undefined;
  }
  return document;
}

export async function deleteSadoAfterHeight(height: number) {
  await collection.deleteMany({ height: { $gt: height } });
}

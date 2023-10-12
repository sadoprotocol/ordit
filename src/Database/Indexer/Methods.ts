import { collection } from "./Collection";

export const indexer = {
  collection,
  setHeight,
  getHeight,
};

async function setHeight(height: number) {
  return collection.updateOne({}, { $set: { block: height } }, { upsert: true });
}

async function getHeight() {
  return collection
    .findOne()
    .then((doc) => doc?.block ?? 0)
    .catch(() => 0);
}

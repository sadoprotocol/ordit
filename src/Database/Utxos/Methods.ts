import { getChunkSize } from "../Utilities";
import { collection, Utxo } from "./Collection";

export const utxos = {
  collection,
  insertMany,
  deleteSpents,
};

async function insertMany(utxos: Utxo[]) {
  const promises = [];
  const chunkSize = getChunkSize();
  for (let i = 0; i < utxos.length; i += chunkSize) {
    const chunk = utxos.slice(i, i + chunkSize);
    promises.push(
      collection.insertMany(chunk, { ordered: false }).catch((error) => {
        if (error.code !== 11000) throw error;
      }),
    );
  }
  await Promise.all(promises);
}

async function deleteSpents(locations: string[]) {
  const promises = [];
  const chunkSize = getChunkSize();
  for (let i = 0; i < locations.length; i += chunkSize) {
    const chunk = locations.slice(i, i + chunkSize);
    promises.push(collection.deleteMany({ location: { $in: chunk } }));
  }
  await Promise.all(promises);
}

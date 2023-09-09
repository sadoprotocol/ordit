import { ignoreDuplicateErrors } from "../../../Utilities/Database";
import { collection, SatRange } from "./Collection";

export const sats = {
  collection,
  insertMany,
  findByLocations,
};

async function insertMany(sats: SatRange[], chunkSize = 500) {
  const promises = [];
  for (let i = 0; i < sats.length; i += chunkSize) {
    const chunk = sats.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function findByLocations(locations: string[]) {
  return collection.find({ location: { $in: locations } }).toArray();
}

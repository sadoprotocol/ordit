import { getChunkSize, ignoreDuplicateErrors } from "~Database/Utilities";

import { Brc20Event, collection } from "./Collection";

export const events = {
  collection,
  addEvents,
  getLastBlock,
};

async function addEvents(events: Brc20Event[]) {
  const promises = [];
  const chunkSize = getChunkSize();
  for (let i = 0; i < events.length; i += chunkSize) {
    const chunk = events.slice(i, i + chunkSize);
    promises.push(collection.insertMany(chunk, { ordered: false }).catch(ignoreDuplicateErrors));
  }
  await Promise.all(promises);
}

async function getLastBlock() {
  const event = await collection.findOne({}, { sort: { number: -1 } });
  if (event === null) {
    return 0;
  }
  return event.meta.block;
}

import { MongoError } from "mongodb";

import { config } from "~Config";

export function getChunkSize() {
  return config.index.chunkSize ?? 1_000;
}

export function ignoreDuplicateErrors(error: MongoError) {
  if (error.code !== 11000) {
    throw error;
  }
}

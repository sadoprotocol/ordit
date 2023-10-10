import { MongoError } from "mongodb";

export function ignoreDuplicateErrors(error: MongoError) {
  if (error.code !== 11000) {
    throw error;
  }
}

export function getChunkSize(length: number) {
  if (length > 4_000) {
    return Math.ceil(length / 4);
  }
  return 1_000;
}

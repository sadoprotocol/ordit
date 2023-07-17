import { MongoError } from "mongodb";

export function ignoreDuplicateErrors(error: MongoError) {
  if (error.code !== 11000) {
    throw error;
  }
}

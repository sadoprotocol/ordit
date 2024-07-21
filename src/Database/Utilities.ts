import { config } from "~Config";

export function getChunkSize() {
  return config.indexer.chunkSize ?? 1_000;
}

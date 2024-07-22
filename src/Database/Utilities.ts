import { config } from "~Config";

export function getChunkSize() {
  return config.index.chunkSize ?? 1_000;
}

export * from "./Collection";
export * from "./Methods.ts";
import { collectionBlocks, collectionEtchings, collectionMintCount, collectionUtxoBalances } from "~Database/Runes";

export const runesBlocks = {
  collectionBlocks,
};
export const runesEtchings = {
  collectionEtchings,
};
export const runesUtxoBalances = {
  collectionUtxoBalances,
};
export const runesMintCounts = {
  collectionMintCount,
};

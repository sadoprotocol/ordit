export * from "./Collection";
export * from "./Methods.ts";
import { collectionBlocks, collectionRunes, collectionUtxoBalances } from "~Database/Runes";

export const runesBlocks = {
  collectionBlocks,
};
export const runesEtchings = {
  collectionRunes,
};
export const runesUtxoBalances = {
  collectionUtxoBalances,
};

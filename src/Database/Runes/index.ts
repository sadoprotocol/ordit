export * from "./Collection";
import { collectionBlocks, collectionEtchings, collectionUtxoBalances } from "~Database/Runes";

export const runesBlocks = {
  collectionBlocks,
};
export const runesEtchings = {
  collectionEtchings,
};
export const runesUtxoBalances = {
  collectionUtxoBalances,
};

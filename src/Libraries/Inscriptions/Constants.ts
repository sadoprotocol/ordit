import { config } from "../../Config";

// prettier-ignore
export const INSCRIPTION_EPOCH_BLOCK =
  config.network === "mainnet" ? 767_430 :
  config.network === "testnet" ? 2_413_343 :
  config.network === "signet" ? 112_402 :
  0;

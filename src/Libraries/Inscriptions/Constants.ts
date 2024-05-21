import { config } from "../../Config";

// prettier-ignore
export const INSCRIPTION_EPOCH_BLOCK =
  config.network === "mainnet" ? 767_429 :
  config.network === "testnet" ? 2_413_342 :
  config.network === "signet" ? 112_401 :
  0;

import { config } from "../../Config";

export const INSCRIPTION_EPOCH_BLOCK =
  config.network === "mainnet" ? 767_429 : config.network === "testnet" ? 2_413_342 : 0;

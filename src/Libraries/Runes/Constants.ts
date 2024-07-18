import { config } from "../../Config";

export const RUNES_BLOCK =
  config.network === "mainnet"
    ? 840_000
    : config.network === "testnet"
    ? 2_413_343
    : config.network === "signet"
    ? 188_714
    : 0;

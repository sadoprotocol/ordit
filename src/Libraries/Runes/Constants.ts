import { config } from "../../Config";

export const RUNES_BLOCK =
  config.network === "mainnet"
    ? 840_000
    : config.network === "testnet"
      ? 2520000
      : config.network === "signet"
        ? 188_714
        : config.network === "fractal"
          ? 21_000
          : 0;

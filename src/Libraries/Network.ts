import { networks } from "bitcoinjs-lib";

import { config } from "../Config";

export const VALID_NETWORK = ["mainnet", "testnet", "signet", "regtest"] as const;

export type Network = (typeof VALID_NETWORK)[number];

/**
 * Check if provided unknown value is a valid network.
 *
 * @param value - Unknown value to check.
 *
 * @returns True if valid network, false otherwise.
 */
export function isValidNetwork(value: unknown): value is Network {
  return VALID_NETWORK.find((n) => n === value) !== undefined;
}

export function getBitcoinNetwork(): networks.Network {
  switch (config.network) {
    case "mainnet": {
      return networks.bitcoin;
    }
    case "testnet": {
      return networks.testnet;
    }
    case "signet": {
      return networks.testnet;
    }
    case "regtest": {
      return networks.regtest;
    }
  }
}

/**
 * Convert an environment variable to a valid bitcoin network value.
 *
 * @param value - Value to convert.
 */
export function envToNetwork(value: unknown): Network {
  if (isValidNetwork(value)) {
    return value;
  }
  throw new Error(`Config Exception: Provided network ${value} is not valid`);
}

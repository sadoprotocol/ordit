import { config } from "../../Config";

export function getIndexPath(path: string): string {
  return `${getNetworkPath(path)}/index.redb`;
}

export function getNetworkPath(path: string) {
  switch (config.network) {
    case "mainnet": {
      return `${path}`;
    }
    case "testnet": {
      return `${path}/testnet3`;
    }
    case "regtest": {
      return `${path}/regtest`;
    }
    default: {
      throw new Error(`Ord Index Path: invalid network ${config.network} provided in config.`);
    }
  }
}

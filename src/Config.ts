import { envToBoolean, envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { envToNetwork } from "./Libraries/Network";

export const config = {
  api: {
    domain: getEnvironmentVariable("DOMAIN"),
    port: getEnvironmentVariable("PORT", envToNumber),
    token: getEnvironmentVariable("TOKEN"),
  },
  chain: {
    network: getEnvironmentVariable("CHAIN_NETWORK", envToNetwork),
    currency: getEnvironmentVariable("CHAIN_CURRENCY"),
    symbol: getEnvironmentVariable("CHAIN_SYMBOL"),
    decimals: getEnvironmentVariable("CHAIN_DECIMALS", envToNumber),
    reorgMin: getEnvironmentVariable("CHAIN_REORGMIN", envToNumber),
    path: getEnvironmentVariable("CHAIN_PATH"),
  },
  rpc: {
    host: getEnvironmentVariable("RPC_HOST"),
    port: getEnvironmentVariable("RPC_PORT", envToNumber),
    user: getEnvironmentVariable("RPC_USER"),
    password: getEnvironmentVariable("RPC_PASSWORD"),
  },
  ord: {
    bin: getEnvironmentVariable("ORD"),
    maxSnapshots: getEnvironmentVariable("ORD_SNAPSHOT_LIMIT", envToNumber),
    enabled: getEnvironmentVariable("ORD_INDEXER_ENABLED", envToBoolean),
  },
  parser: {
    port: getEnvironmentVariable("UTXO_PARSER_PORT", envToNumber),
    maxBlockHeight: getEnvironmentVariable("UTXO_PARSER_MAX_BLOCK", envToNumber),
    enabled: getEnvironmentVariable("UTXO_PARSER_ENABLED", envToBoolean),
  },
  mongo: {
    hostname: getEnvironmentVariable("MONGO_HOSTNAME"),
    port: getEnvironmentVariable("MONGO_PORT", envToNumber),
    database: getEnvironmentVariable("MONGO_DATABASE"),
    username: getEnvironmentVariable("MONGO_USERNAME"),
    password: getEnvironmentVariable("MONGO_PASSWORD"),
  },
  sochain: {
    url: getEnvironmentVariable("SOCHAIN_URL"),
    network: getEnvironmentVariable("SOCHAIN_NETWORK"),
    coin: getEnvironmentVariable("SOCHAIN_COIN"),
    token: getEnvironmentVariable("SOCHAIN_TOKEN"),
  },
};

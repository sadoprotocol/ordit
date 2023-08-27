import { envToBoolean, envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { envToNetwork } from "./Libraries/Network";

export const config = {
  network: getEnvironmentVariable("NETWORK", envToNetwork),
  api: {
    domain: getEnvironmentVariable("DOMAIN"),
    port: getEnvironmentVariable("PORT", envToNumber),
  },
  rpc: {
    host: getEnvironmentVariable("RPC_HOST"),
    port: getEnvironmentVariable("RPC_PORT", envToNumber),
    user: getEnvironmentVariable("RPC_USER"),
    password: getEnvironmentVariable("RPC_PASSWORD"),
  },
  parser: {
    host: getEnvironmentVariable("UTXO_PARSER_HOST"),
    port: getEnvironmentVariable("UTXO_PARSER_PORT", envToNumber),
    enabled: getEnvironmentVariable("UTXO_PARSER_ENABLED", envToBoolean),
  },
  ord: {
    host: getEnvironmentVariable("ORD_HOST"),
    port: getEnvironmentVariable("ORD_PORT", envToNumber),
    enabled: getEnvironmentVariable("ORD_INDEXER_ENABLED", envToBoolean),
  },
  sado: {
    startBlock: getEnvironmentVariable("SADO_START_BLOCK", envToNumber),
    enabled: getEnvironmentVariable("SADO_PARSER_ENABLED", envToBoolean),
  },
  reorg: {
    scanLength: getEnvironmentVariable("REORG_SCAN_LENGTH", envToNumber),
    treshold: getEnvironmentVariable("REORG_MANUAL_TRESHOLD", envToNumber),
    debug: getEnvironmentVariable("REORG_DEBUG", envToBoolean),
  },
  ipfs: {
    gateway: getEnvironmentVariable("IPFS_GATEWAY"),
    api: getEnvironmentVariable("IPFS_API"),
  },
  mongo: {
    hostname: getEnvironmentVariable("MONGO_HOSTNAME"),
    port: getEnvironmentVariable("MONGO_PORT", envToNumber),
    database: getEnvironmentVariable("MONGO_DATABASE"),
    username: getEnvironmentVariable("MONGO_USERNAME"),
    password: getEnvironmentVariable("MONGO_PASSWORD"),
  },
};

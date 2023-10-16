import { envToBoolean, envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { envToNetwork } from "./Libraries/Network";

export const config = {
  network: getEnvironmentVariable("NETWORK", envToNetwork),
  api: {
    uri: getEnvironmentVariable("API_URI"),
    host: getEnvironmentVariable("API_HOST"),
    port: getEnvironmentVariable("API_PORT", envToNumber),
    replicas: getEnvironmentVariable("API_REPLICAS", envToNumber),
  },
  worker: {
    uri: getEnvironmentVariable("WORKER_URI"),
    host: getEnvironmentVariable("WORKER_HOST"),
    port: getEnvironmentVariable("WORKER_PORT", envToNumber),
  },
  output: {
    enabled: getEnvironmentVariable("OUTPUT_PARSER_ENABLED", envToBoolean),
  },
  utxo: {
    enabled: getEnvironmentVariable("UTXO_PARSER_ENABLED", envToBoolean),
  },
  ord: {
    uri: getEnvironmentVariable("ORD_URI"),
    enabled: getEnvironmentVariable("ORD_INDEXER_ENABLED", envToBoolean),
  },
  brc20: {
    enabled: getEnvironmentVariable("BRC20_ENABLED", envToBoolean),
  },
  sado: {
    startBlock: getEnvironmentVariable("SADO_START_BLOCK", envToNumber),
    enabled: getEnvironmentVariable("SADO_PARSER_ENABLED", envToBoolean),
  },
  rpc: {
    uri: getEnvironmentVariable("RPC_URI"),
    port: getEnvironmentVariable("RPC_PORT", envToNumber),
    user: getEnvironmentVariable("RPC_USER"),
    password: getEnvironmentVariable("RPC_PASSWORD"),
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
  redis: {
    hostname: getEnvironmentVariable("REDIS_HOSTNAME"),
    port: getEnvironmentVariable("REDIS_PORT", envToNumber),
  },
  faucet: {
    seed: getEnvironmentVariable("FAUCET_SEED"),
    auth: getEnvironmentVariable("FAUCET_AUTH"),
  },
};

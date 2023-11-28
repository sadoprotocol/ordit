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
  index: {
    outputs: getEnvironmentVariable("INDEX_OUTPUTS", envToBoolean),
    utxos: getEnvironmentVariable("INDEX_UTXOS", envToBoolean),
    inscriptions: getEnvironmentVariable("INDEX_INSCRIPTIONS", envToBoolean),
    brc20: getEnvironmentVariable("INDEX_BRC20", envToBoolean),
    sado: getEnvironmentVariable("INDEX_SADO", envToBoolean),
  },
  ord: {
    uri: getEnvironmentVariable("ORD_URI"),
  },
  sado: {
    startBlock: getEnvironmentVariable("SADO_START_BLOCK", envToNumber),
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
  faucet: {
    seed: getEnvironmentVariable("FAUCET_SEED"),
    auth: getEnvironmentVariable("FAUCET_AUTH"),
  },
};

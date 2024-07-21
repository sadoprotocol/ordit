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
    maxheight: getEnvironmentVariable("MAXHEIGHT", envToNumber, true),
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
    threshold: getEnvironmentVariable("REORG_MANUAL_THRESHOLD", envToNumber),
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
    srvConnection: getEnvironmentVariable("MONGO_SRV_CONNECTION", envToBoolean),
    directConnection: getEnvironmentVariable("MONGO_DIRECT_CONNECTION", envToBoolean),
  },
  // deployed database, is the current database used by the public RPC (mainnet/testnet).
  // used for task script only, ex: for migration spent flag from previous active db to the new one
  deployedMongo: {
    hostname: getEnvironmentVariable("DEPLOYED_MONGO_HOSTNAME"),
    port: getEnvironmentVariable("DEPLOYED_MONGO_PORT", envToNumber),
    database: getEnvironmentVariable("DEPLOYED_MONGO_DATABASE"),
    username: getEnvironmentVariable("DEPLOYED_MONGO_USERNAME"),
    password: getEnvironmentVariable("DEPLOYED_MONGO_PASSWORD"),
    srvConnection: getEnvironmentVariable("DEPLOYED_MONGO_SRV_CONNECTION", envToBoolean),
    directConnection: getEnvironmentVariable("DEPLOYED_MONGO_DIRECT_CONNECTION", envToBoolean),
  },
  faucet: {
    seed: getEnvironmentVariable("FAUCET_SEED"),
    auth: getEnvironmentVariable("FAUCET_AUTH"),
  },
  indexer: {
    height_threshold: getEnvironmentVariable("INDEXER_HEIGHT", envToNumber, true),
    blocks_threshold: getEnvironmentVariable("INDEXER_COMMIT_BLOCKS", envToNumber, true),
    chunkSize: getEnvironmentVariable("INDEXER_DB_CHUNK_SIZE", envToNumber, true),
  },
};

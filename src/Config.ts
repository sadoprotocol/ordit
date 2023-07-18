import { envToNumber, getEnvironmentVariable } from "./Libraries/Environment";
import { envToNetwork } from "./Libraries/Network";

export const config = {
  chain: {
    network: getEnvironmentVariable("NETWORK", envToNetwork),
    currency: getEnvironmentVariable("CURRENCY"),
    symbol: getEnvironmentVariable("SYMBOL"),
    decimals: getEnvironmentVariable("DECIMALS", envToNumber),
    reorgMin: getEnvironmentVariable("REORGMIN", envToNumber),
  },
  rpc: {
    host: getEnvironmentVariable("RPC_HOST"),
    port: getEnvironmentVariable("RPC_PORT", envToNumber),
    user: getEnvironmentVariable("RPC_USER"),
    password: getEnvironmentVariable("RPC_PASSWORD"),
  },
  api: {
    port: getEnvironmentVariable("PORT", envToNumber),
  },
  crawler: {
    interval: getEnvironmentVariable("CRAWLER_INTERVAL", envToNumber),
    maxBlockHeight: getEnvironmentVariable("CRAWLER_MAX_BLOCK", envToNumber),
  },
  ord: {
    inscriptionMediaUrl: getEnvironmentVariable("ORD_INSCRIPTION_MEDIA_URL"),
    dataOne: getEnvironmentVariable("ORD_DATA_ONE"),
    dataTwo: getEnvironmentVariable("ORD_DATA_TWO"),
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

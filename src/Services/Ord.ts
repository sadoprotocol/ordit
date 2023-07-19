import { config } from "../Config";
import { DIR_BIN, ORD_DATA } from "../Paths";
import { cli } from "./Cli";

export const command = `${DIR_BIN}/ord`;

export const networkFlag = {
  regtest: "-r",
  testnet: "-t",
  mainnet: "",
};

export const bitcoinArgs = [
  networkFlag[config.chain.network],
  `--bitcoin-data-dir=${config.chain.path}`,
  `--bitcoin-rpc-user=${config.rpc.user}`,
  `--bitcoin-rpc-pass=${config.rpc.password}`,
  `--rpc-url=http://${config.rpc.host}:${config.rpc.port}`,
];

export const ord = {
  index,
  list,
  traits,
  inscription,
  inscriptions,
  reorg,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Run ord index command.
 *
 * @param dataDir - Data directory to run ord index command on.
 */
async function index(dataDir: string): Promise<void> {
  await cli.run(command, [...bitcoinArgs, `--data-dir=${dataDir}`, "--index-sats", "index", "run"]);
}

/**
 * List satoshis under a given location in the format of _(txid:vout)_.
 *
 * @param location - Location of the utxo to list ordinals for.
 */
async function list(location: string): Promise<Satoshi[]> {
  return JSON.parse(await cli.run(command, [...bitcoinArgs, `--data-dir=${ORD_DATA}`, "list", location]));
}

/**
 * Get traits for the given satoshi.
 *
 * @param satoshi - Satoshi to get traits for.
 */
async function traits(satoshi: number): Promise<Traits> {
  return JSON.parse(await cli.run(command, [...bitcoinArgs, `--data-dir=${ORD_DATA}`, "traits", satoshi.toString()]));
}

async function inscription(id: string): Promise<Inscription> {
  return toInscription(JSON.parse(await cli.run(command, [...bitcoinArgs, `--data-dir=${ORD_DATA}`, "gie", id])));
}

async function inscriptions(location: string): Promise<string[]> {
  return JSON.parse(await cli.run(command, [...bitcoinArgs, `--data-dir=${ORD_DATA}`, "gioo", location]));
}

async function reorg(data = ORD_DATA): Promise<boolean> {
  return JSON.parse(await cli.run(command, [...bitcoinArgs, `--data-dir=${data}`, "reorg"])).is_reorged;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function toInscription(inscription: any): Inscription {
  return {
    fee: inscription.fee,
    height: inscription.height,
    number: inscription.number,
    sat: inscription.sat,
    timestamp: inscription.timestamp,
    mediaType: inscription.media_type,
    mediaSize: inscription.media_size,
    mediaContent: inscription.media_content,
  };
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Inscription = {
  fee: number;
  height: number;
  number: number;
  sat?: Satoshi;
  timestamp: number;
  mediaType: string;
  mediaSize: number;
  mediaContent: string;
};

export type Satoshi = {
  output: string;
  start: number;
  size: number;
  rarity: Rarity;
  name: string;
};

export type Traits = {
  number: number;
  decimal: string;
  degree: string;
  name: string;
  height: number;
  cycle: number;
  epoch: number;
  period: number;
  offset: number;
  rarity: Rarity;
};

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

import { config } from "../../Config";
import { Inscription } from "../../Database/Inscriptions";
import { ORD_DATA } from "../../Paths";
import { isError } from "../../Utilities/Response";
import { getStatus } from "../../Workers/Ordinals/Status";
import { cli } from "../Cli";

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
].filter((val) => val !== "");

export const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

/*
 |--------------------------------------------------------------------------------
 | Service
 |--------------------------------------------------------------------------------
 */

export const ord = {
  index,
  height,
  list,
  traits,
  getInscriptionsByBlock,
  latestInscriptionIds,
  inscription,
  inscriptions,
  status,
  version,
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
async function index(dataDir?: string): Promise<void> {
  await run(["--index-sats", "index", "run"], dataDir);
}

/**
 * Return the current height from ord.
 *
 * @returns current ord index height
 */
async function height(): Promise<number> {
  const result = await run<number>(["trinity", "height"]);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result;
}

/**
 * List satoshis under a given location in the format of _(txid:vout)_.
 *
 * @param location - Location of the utxo to list ordinals for.
 */
async function list(location: string): Promise<Satoshi[]> {
  const result = await run<Satoshi[]>(["list", location]);
  if (isError(result)) {
    if (result.error.includes("output not found")) {
      return [];
    }
    throw new Error(result.error);
  }
  return result;
}

/**
 * Get traits for the given satoshi.
 *
 * @param satoshi - Satoshi to get traits for.
 */
async function traits(satoshi: number): Promise<Traits> {
  const result = await run<Traits>(["traits", satoshi.toString()]);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result;
}

/**
 * Get inscriptions for the given block height.
 *
 * @param blockHeight - Block height to get inscriptions for.
 */
async function getInscriptionsByBlock(blockHeight: number): Promise<any[]> {
  const result = await run<any[]>(["trinity", "block", blockHeight.toString()]);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result;
}

async function latestInscriptionIds(limit?: number, from?: number): Promise<LatestInscriptionIds> {
  const args = ["trinity", "latest"];
  if (limit) {
    args.push(limit.toString());
  }
  if (from) {
    args.push(from.toString());
  }
  const result = await run<LatestInscriptionIds>(args);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result;
}

async function inscription(id: string): Promise<Inscription> {
  const result = await run<any>(["trinity", "id", id]);
  if ("error" in result) {
    throw new Error(result.error);
  }
  return toInscription(id, result);
}

async function inscriptions(location: string): Promise<string[]> {
  const result = await run<{ inscriptions: string[] }>(["trinity", "output", location]);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result.inscriptions;
}

async function status(): Promise<any> {
  return getStatus();
}

async function version(): Promise<string> {
  const data = await cli.run(config.ord.bin, ["--version"]);
  if (data.includes("ord")) {
    return data.replace("ord", "").replace("\n", "").trim();
  }
  return "unknown";
}

/*
 |--------------------------------------------------------------------------------
 | Request
 |--------------------------------------------------------------------------------
 */

async function run<R>(args: ReadonlyArray<string>, dataDir = ORD_DATA): Promise<Response<R>> {
  const data = await cli.run(config.ord.bin, [...bitcoinArgs, `--data-dir=${dataDir}`, ...args]);
  try {
    return JSON.parse(data) as R;
  } catch (_) {
    return { error: data } as const;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function toInscription(id: string, inscription: any): Inscription {
  const data = {
    id,
    outpoint: inscription.output,
    owner: inscription.address,
    ...inscription,
    mediaType: inscription.media.kind,
    mediaSize: inscription.media.size,
    mediaContent: inscription.media.content,
  };
  delete data.address;
  delete data.media;
  delete data.output;
  return data;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type RarityOptions = {
  allowedrarity?: Rarity[];
};

export type Ordinal = Satoshi & Traits;

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

export type Rarity = (typeof rarity)[number];

type LatestInscriptionIds = {
  inscriptions: string[];
  prev: number | null;
  next: number | null;
};

type Response<R> =
  | R
  | {
      error: string;
    };

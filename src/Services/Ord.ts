import { config } from "../Config";
import { Inscription } from "../Database/Inscriptions";
import { ORD_DATA, ORD_DATA_SNAPSHOT, ORD_DATA_SNAPSHOTS } from "../Paths";
import { fileExists, readDir } from "../Utilities/Files";
import { Queue } from "../Utilities/Queue";
import { isError } from "../Utilities/Response";
import { getStatus } from "../Workers/Ordinals/Status";
import { cli } from "./Cli";

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
  list,
  traits,
  latestInscriptionIds,
  inscription,
  inscriptions,
  reorg,
  status,
  version,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

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

async function latestInscriptionIds(limit?: number, from?: number): Promise<LatestInscriptionIds> {
  const args = ["gli"];
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
  const result = await run<any>(["gie", id]);
  if ("error" in result) {
    throw new Error(result.error);
  }
  return toInscription(id, result);
}

async function inscriptions(location: string): Promise<string[]> {
  const result = await run<{ inscriptions: string[] }>(["gioo", location]);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result.inscriptions;
}

async function reorg(data = ORD_DATA): Promise<boolean> {
  const result = await run<{ is_reorged: boolean }>(["reorg"], data);
  if (isError(result)) {
    throw new Error(result.error);
  }
  return result.is_reorged;
}

async function status(): Promise<any> {
  return {
    indexer: await getStatus(),
    snapshot: {
      running: await fileExists(`${ORD_DATA_SNAPSHOT}/lock`),
      backups: await readDir(ORD_DATA_SNAPSHOTS),
    },
  };
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

const queue = new Queue(async ({ args, dataDir }: { args: ReadonlyArray<string>; dataDir: string }) => {
  const data = await cli.run(config.ord.bin, [...bitcoinArgs, `--data-dir=${dataDir}`, ...args]);
  try {
    return JSON.parse(data);
  } catch (_) {
    return { error: data } as const;
  }
});

async function run<R>(args: ReadonlyArray<string>, dataDir = ORD_DATA): Promise<Response<R>> {
  return new Promise<Response<R>>((resolve, reject) => {
    queue.push({ args, dataDir }, resolve, reject);
  });
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

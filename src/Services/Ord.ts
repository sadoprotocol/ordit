import { NotFoundError } from "@valkyr/api";
import fetch from "node-fetch";

import { sleep } from "~Utilities/Helpers";

import { config } from "../Config";

export const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const ord = {
  getHeight,
  getOrdinals,
  getInscription,
  getInscriptions,
  getInscriptionsForIds,
  waitForBlock,
  waitForInscriptions,
  getRuneDetail,
  getRuneOutputsBalancesByOutpoints,
  getRuneOutputsBalancesByOutpoint,
};

class OrdError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly text: string,
    readonly url: string,
  ) {
    super(text ?? `${status} ${statusText} ${url}`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Get last block parsed.
 */
async function getHeight(): Promise<number> {
  return call<number>("/blockheight");
}

/**
 * Get all ordinals listed for the given outpoint.
 * Ordzaar ord custom api
 *
 * @param outpoint - Outpoint to get ordinals for.
 */
async function getOrdinals(outpoint: string): Promise<Ordinal[]> {
  return call<Ordinal[]>(`/ordinals/${outpoint}`);
}

/**
 * Get inscription data for the given id.
 *
 * @param id - Inscription id.
 */
async function getInscription(id: string) {
  try {
    return await call<OrdInscriptionData>(`/inscription/${id}`);
  } catch (error) {
    if (error instanceof OrdError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

async function getInscriptions(ids: string[]) {
  try {
    console.log('NORMAL API CALL');
    return call<OrdInscriptionData[]>(`/inscriptions`, ids);
  } catch (error) {
    if (error instanceof OrdError) {
      return [];
    }
    throw error;
  }
}

/**
 * Get inscription data for the given ids.
 *  Ordzaar ord custom api
 *
 * @param ids - Inscription ids.
 */
async function getInscriptionsForIds(ids: string[]) {
  try {
    console.log('CUSTOM API CALL');
    return call<OrdInscription[]>(`/inscriptions`, { ids });
  } catch (error) {
    if (error instanceof OrdError) {
      return [];
    }
    throw error;
  }
}

/**
 * Ensure that ord has processed the block before continuing.
 *
 * @param blockHeight - Block height to wait for.
 * @param seconds     - How many seconds to wait between attempts.
 */
async function waitForBlock(blockHeight: number, seconds = 1): Promise<void> {
  const ordHeight = await call<number>("/blockheight");
  if (ordHeight >= blockHeight) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  return waitForBlock(blockHeight, seconds);
}

/**
 * Ensure that inscriptions at block is ready before processing subsequent
 * operations.
 *
 * @param blockHeight - Block height to wait for.
 * @param seconds     - How many seconds to wait between attempts.
 */
async function waitForInscriptions(blockHeight: number, seconds = 1): Promise<void> {
  try {
    const status = await call<number>(`/inscriptions/block/check/${blockHeight}`);
    if (status === 1) {
      return;
    }
  } catch (error) {
    console.log(error);
  }
  return sleep(seconds).then(() => waitForInscriptions(blockHeight, seconds));
}

/**
 * Get rune detail data for the given rune id or name.
 * Ordzaar ord custom api
 *
 * @param runeQuery - Rune id or name, example: "INDOMIE.GORENG" or "2581611:1558".
 */
async function getRuneDetail(runeQuery: string) {
  return call<RuneDetail>(`/ordzaar/rune/${runeQuery}`);
}

/**
 * Get rune balance data for the given outpoints.
 * Ordzaar ord custom api
 *
 * @param outpoints - Outpoints, example: ["dd454c47c4a57867e48bc063e2feba8b3ce54cb4dc17c294a12b13cb48382d51:2"]
 */
async function getRuneOutputsBalancesByOutpoints(outpoints: string[]) {
  return call<{ [key: string]: RuneOutputBalance[] }>(`/ordzaar/rune/outputs/bulk?outpoints=${outpoints.join(",")}`);
}

/**
 * Get rune balance data for the given outpoint.
 * Ordzaar ord custom api
 *
 * @param outpoints - Outpoints, example: "dd454c47c4a57867e48bc063e2feba8b3ce54cb4dc17c294a12b13cb48382d51:2"
 */
async function getRuneOutputsBalancesByOutpoint(outpoint: string) {
  return call<{ [key: string]: RuneOutputBalance }>(`/ordzaar/rune/output/${outpoint}`);
}
/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function call<R>(path: string, data?: any): Promise<R> {
  const options: any = {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  };

  if (data !== undefined) {
    options.method = "POST";
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${config.ord.uri}${path}`, options);
  if (response.status === 404) {
    throw new NotFoundError(await response.text());
  }
  if (response.status !== 200) {
    console.log(response.statusText);
    console.log(await response.text());
    console.log(JSON.stringify(data));
    throw new OrdError(response.status, response.statusText, await response.text(), response.url);
  }
  return response.json() as R;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export function getSafeToSpendState(
  ordinals: any[],
  inscriptions: any[],
  runeBalances: { [key: string]: RuneOutputBalance },
  allowedRarity: Rarity[] = ["common", "uncommon"],
): boolean {
  if (inscriptions.length > 0 || ordinals.length === 0) {
    return false;
  }
  for (const ordinal of ordinals) {
    if (allowedRarity.includes(ordinal.rarity) === false) {
      return false;
    }
  }
  if (Object.keys(runeBalances).length > 0) {
    return false;
  }
  return true;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type OrdInscription = {
  inscription_id: string;
  number: number;
  sequence: number;
  genesis_height: number;
  genesis_fee: number;
  sat: number;
  satpoint: string;
  timestamp: number;
};

export type OrdInscriptionData = {
  address?: string;
  children: string[];
  content_length?: number;
  content_type?: string;
  content_encoding?: string;
  genesis_fee: number;
  genesis_height: number;
  id: string;
  number: number;
  inscription_sequence: number;
  output_value?: number;
  parents?: string[];
  delegate?: string;
  sat: number;
  satpoint: string;
  timestamp: number;
};

export type Ordinal = {
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
  output: string;
  start: number;
  end: number;
  size: number;
};

export type RuneDetailTerms = {
  amount?: string;
  cap?: string;
  height?: [string | null, string | null];
  offset?: [string | null, string | null];
};

export type RuneDetail = {
  rune_id: string;
  rune: string;
  spaced_rune: string;
  mintable: boolean;
  block: string;
  divisibility: number;
  etching: string;
  mints: string;
  number: string;
  premine: string;
  terms?: RuneDetailTerms;
  symbol?: string;
  burned?: string;
  timestamp: string;
};

export type RuneOutputBalance = {
  spaced_rune: string;
  amount: string;
  divisibility: number;
  symbol?: string;
};

export type Rarity = (typeof rarity)[number];

import { NotFoundError } from "@valkyr/api";
import fetch from "node-fetch";

import { sleep } from "~Utilities/Helpers";

import { config } from "../Config";

export const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const ord = {
  getHeight,
  getOutputs,
  getOrdinals,
  getInscription,
  getInscriptionsForIds,
  waitForBlock,
  waitForInscriptions,
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

async function getOutputs(outpoints: string[]): Promise<any[]> {
  return call<any[]>(`/outputs`, { outpoints });
}

/**
 * Get all ordinals listed for the given outpoint.
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
    return await call<InscriptionData>(`/inscription/${id}`);
  } catch (error) {
    if (error instanceof OrdError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Get inscription data for the given ids.
 *
 * @param ids - Inscription ids.
 */
async function getInscriptionsForIds(ids: string[]) {
  return call<OrdInscription[]>(`/inscriptions`, { ids });
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
    options.body = JSON.stringify(data);
    options.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${config.ord.uri}${path}`, options);
  if (response.status === 404) {
    throw new NotFoundError(await response.text());
  }
  if (response.status !== 200) {
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

export type InscriptionData = {
  address?: string;
  children: string[];
  content_length?: number;
  content_type?: string;
  content_encoding?: string;
  genesis_fee: number;
  genesis_height: number;
  inscription_id: string;
  inscription_number: number;
  inscription_sequence: number;
  output_value?: number;
  parent?: string;
  delegate?: string;
  sat?: number;
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

export type Rarity = (typeof rarity)[number];

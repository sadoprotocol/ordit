import fetch from "node-fetch";

import { config } from "../Config";

export const rarity = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

export const ord = {
  getHeight,
  getOrdinals,
  getBlockInscriptions,
  getInscription,
  getInscriptionsForIds,
  waitForBlock,
  waitForInscriptions,
};

class OrdError extends Error {
  constructor(
    readonly status: number,
    readonly statusText: string,
    readonly url: string,
  ) {
    super("failed to resolve ord api call");
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
 *
 * @param outpoint - Outpoint to get ordinals for.
 */
async function getOrdinals(outpoint: string): Promise<Ordinal[]> {
  return call<Ordinal[]>(`/ordinals/${outpoint}`);
}

/**
 * Get inscriptions for a block.
 *
 * @param blockHeight - Block height to get inscriptions for.
 * @param seconds     - How many seconds to wait between attempts.
 */
async function getBlockInscriptions(blockHeight: number, seconds = 1): Promise<Inscription[]> {
  return call<Inscription[]>(`/inscriptions/block/${blockHeight}`).catch((error) => {
    console.log(error);
    return sleep(seconds).then(() => getBlockInscriptions(blockHeight, seconds));
  });
}

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

async function getInscriptionsForIds(ids: string[], attempts = 0) {
  if (attempts > 10) {
    return [];
  }
  const inscriptions = await call<
    {
      inscription_id: string;
      number: number;
      genesis_height: number;
      genesis_fee: number;
      sat: number;
      satpoint: string;
      timestamp: number;
    }[]
  >(`/inscriptions`, { ids });
  if (inscriptions.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getInscriptionsForIds(ids, attempts + 1);
  }
  return inscriptions;
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

async function call<R>(endpoint: string, data?: any): Promise<R> {
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

  const response = await fetch(`${config.ord.endpoint}${endpoint}`, options);
  if (response.status !== 200) {
    throw new OrdError(response.status, response.statusText, response.url);
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
 | Helpers
 |--------------------------------------------------------------------------------
 */

async function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type Inscription = {
  id: string;
  address: string;
  sat: number;
  media: InscriptionMedia;
  timestamp: number;
  height: number;
  fee: number;
  genesis: string;
  number: number;
  output: string;
};

type InscriptionData = {
  inscription_id: string;
  number: number;
  genesis_fee: number;
  genesis_height: number;
  output_value: number;
  address: string;
  sat: number;
  satpoint: string;
  content_type: string;
  content_length: number;
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

type InscriptionMedia = {
  kind: string;
  size: number;
  content: string;
};

export type Rarity = (typeof rarity)[number];

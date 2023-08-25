import fetch from "node-fetch";

import { config } from "../../Config";

export const api = {
  getHeight,
  getOutput,
  getBlockInscriptions,
  waitForBlock,
  waitForInscriptions,
};

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

async function getOutput(output: string): Promise<any> {
  return call<any>(`/output/${output}`);
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

/**
 * Ensure that ord has processed the block before continuing.
 *
 * @param blockHeight - Block height to wait for.
 * @param seconds     - How many seconds to wait between attempts.
 */
async function waitForBlock(blockHeight: number, seconds = 1): Promise<void> {
  const ordHeight = await call<number>("/blockheight");
  if (ordHeight <= blockHeight) {
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

async function call<R>(endpoint: string): Promise<R> {
  const response = await fetch(`${getRpcUri()}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (response.status !== 200) {
    throw new Error("failed to resolve ord api call");
  }
  return response.json();
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function getRpcUri(): string {
  return `http://${config.ord.host}:${config.ord.port}`;
}

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

type InscriptionMedia = {
  kind: string;
  size: number;
  content: string;
};

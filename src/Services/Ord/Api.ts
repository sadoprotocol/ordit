import debug from "debug";
import fetch from "node-fetch";

import { config } from "../../Config";
import { logger } from "../../Logger";

const log = debug("ord-api");

export const api = {
  getHeight,
  getBlockInscriptions,
  waitForBlock,
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

/**
 * Get inscriptions for a block.
 *
 * @param blockHeight - Block height to get inscriptions for.
 */
async function getBlockInscriptions(blockHeight: number): Promise<Inscription[]> {
  return call<Inscription[]>(`/inscriptions/block/${blockHeight}`);
}

/**
 * Ensure that ord has processed the block before continuing.
 *
 * @param blockHeight - Block height to wait for.
 */
async function waitForBlock(blockHeight: number): Promise<void> {
  const ordHeight = await call<number>("/blockheight");
  if (ordHeight <= blockHeight) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return waitForBlock(blockHeight);
}

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function call<R>(endpoint: string): Promise<R> {
  const ts = performance.now();
  try {
    const response = await fetch(`${getRpcUri()}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (response.status !== 200) {
      throw new Error("failed to resolve inscriptions");
    }
    return await response.json();
  } catch (error) {
    console.log("Ord Api Error", { endpoint, error });
    throw error;
  } finally {
    const time = performance.now() - ts;
    if (time / 1000 > 1) {
      log("rpc call %s took %s seconds", endpoint, (time / 1000).toFixed(3));
    }
    logger.addRpc(endpoint, time);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function getRpcUri(): string {
  return `http://${config.ord.host}:${config.ord.port}`;
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

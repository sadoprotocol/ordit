import debug from "debug";
import fetch from "node-fetch";

import { config } from "../../Config";
import { logger } from "../../Logger";

const log = debug("ord-api");

export async function api<R>(endpoint: string): Promise<R> {
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

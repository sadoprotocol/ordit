import debug from "debug";
import fetch from "node-fetch";

import { config } from "../../Config";
import { logger } from "../../Logger";

const log = debug("ordit-rpc");

export async function rpc<R>(method: string, args: any[] = []): Promise<R> {
  const ts = performance.now();
  try {
    const id = "ordit";
    const response = await fetch(getRpcUri(), {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        id,
        method: method,
        params: args,
      }),
    });
    const json = await response.json();
    if (json.error !== null) {
      throw new RpcError(json.error, id);
    }
    return json.result;
  } catch (error) {
    if (error instanceof RpcError === false) {
      console.log("RpcError", {
        method,
        args,
      });
    }
    throw error;
  } finally {
    const time = performance.now() - ts;
    if (time / 1000 > 1) {
      log("rpc call %s args %O took %s seconds", method, args, (time / 1000).toFixed(3));
    }
    logger.addRpc(method, time);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

/**
 * Make RPC call response optional by handling a specific error code related to
 * values that can be made optional. If the error code is not encountered or the
 * error is not a RpcError then the error is rethrown.
 *
 * @param code     - Error code representing an optional error clause.
 * @param fallback - Fallback value to return if error code is encountered.
 */
export function optional(code: number): (error: unknown) => undefined;
export function optional<F>(code: number, fallback: F): (error: unknown) => F;
export function optional<F>(code: number, fallback?: F): (error: unknown) => F | undefined {
  return (error: unknown) => {
    if (error instanceof RpcError && error.code === code) {
      return fallback ?? undefined;
    }
    throw error;
  };
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function getRpcUri(): string {
  return `http://${config.rpc.user}:${config.rpc.password}@${config.rpc.host}:${config.rpc.port}`;
}

/*
 |--------------------------------------------------------------------------------
 | Errors
 |--------------------------------------------------------------------------------
 */

export class RpcError {
  constructor(
    readonly error: {
      code: number;
      message: string;
    },
    readonly id: string
  ) {}

  get code(): number {
    return this.error.code;
  }

  get message(): string {
    return this.error.message;
  }
}

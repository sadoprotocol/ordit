import { BadRequestError, InternalError } from "@valkyr/api";
import retry from "async-retry";
import fetch from "node-fetch";

import { sleep } from "~Utilities/Helpers";

import { config } from "../../Config";
import { logger } from "../../Logger";

export async function rpc<R>(method: string, args: any[] = []): Promise<R> {
  const ts = performance.now();
  try {
    const id = "trinity";
    let response = await retry(
      async () => {
        try {
          const res = await fetch(config.rpc.uri, {
            method: "POST",
            headers: {
              Authorization: "Basic " + btoa(`${config.rpc.user}:${config.rpc.password}`),
              "Content-Type": "text/plain",
            },
            body: JSON.stringify({
              jsonrpc: "1.0",
              method: method,
              params: args,
              id,
            }),
          });

          if (res.status === 503) {
            throw RpcError.from(await res.text());
          }

          return res;
        } catch (error) {
          console.log("\n⛑️ RpcError", error.message, { endpoint: config.rpc.uri, method, args });
          console.log("\n⛑️ Retrying in 5 secs..");
          await sleep(5);
          throw error;
        }
      },
      {
        forever: true,
      },
    );
    response = response!;

    if (response.status !== 200) {
      throw RpcError.from(await response.text());
    }

    const text = await response.text();

    let json: any;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new Error(`bitcoin rcp error: ${text}`);
    }

    if (json.error) {
      throw new RpcError(json.error, id);
    }

    return json.result;
  } catch (error) {
    if (error instanceof RpcError === false) {
      console.log("\n⛑️ RpcError", error.message, { endpoint: config.rpc.uri, method, args });
    }
    throw new BadRequestError(error.message, { code: error.code, method });
  } finally {
    const time = performance.now() - ts;
    if (time / 1000 > 3) {
      console.log("\n⏲️ rpc call %s args [%s] took %s seconds", method, args.join(", "), (time / 1000).toFixed(3));
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
 | Errors
 |--------------------------------------------------------------------------------
 */

export class RpcError {
  constructor(
    readonly error: {
      code: number;
      message: string;
    },
    readonly id: string,
  ) {}

  static from(text: string) {
    try {
      const json = JSON.parse(text);
      if (json.error !== null) {
        return new RpcError(json.error, json.id);
      }
    } catch (_) {
      return new InternalError(text);
    }
  }

  get code(): number {
    return this.error.code;
  }

  get message(): string {
    return this.error.message;
  }
}

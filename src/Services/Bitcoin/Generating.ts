import { rpc } from "./Rpc";

export const generating = {
  generateToAddress,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Mine blocks immediately to a specified address (before the RPC call returns).
 *
 * @param address - The address to send the newly generated bitcoin to.
 */
async function generateToAddress(address: string): Promise<string[]> {
  return rpc<string[]>("generatetoaddress", [1, address]);
}

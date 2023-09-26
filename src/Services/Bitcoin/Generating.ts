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
 * @param nBlocks - How many blocks are generated immediately.
 * @param address - The address to send the newly generated bitcoin to.
 */
async function generateToAddress(nBlocks: number, address: string): Promise<string[]> {
  return rpc<string[]>("generatetoaddress", [nBlocks, address]);
}

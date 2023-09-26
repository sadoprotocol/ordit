import { payments } from "bitcoinjs-lib";

import { getBitcoinNetwork } from "../Network";

/**
 * Get a taproot script output for a specific internal public key.
 *
 * @param internalPubkey - Internal public key to generate output for.
 *
 * @returns taproot script output.
 */
export function getPaymentOutput(internalPubkey: Buffer): Buffer {
  const { output } = payments.p2tr({ internalPubkey, network: getBitcoinNetwork() });
  if (output === undefined) {
    throw new Error("Failed to generate output");
  }
  return output;
}

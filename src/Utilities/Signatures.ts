import { verify } from "bitcoinjs-message";

import { getBitcoinNetwork } from "../Libraries/Network";
import { getAddresses } from "./Bip32";
import { decodePsbt, getPsbtAsJSON } from "./PSBT";

/**
 * Checks to see if all the inputs on a PSBT are signed.
 *
 * This is a very weak signature verification pattern that only checks to see if inputs
 * have been signed. It does not do any deeper verification than this as PSBT
 *
 * @param signature - Encoded PSBT to validate.
 * @param location  - Location to be confirmed in the first input of the PSBT.
 */
export function validatePSBTSignature(signature: string, location: string): boolean {
  const psbt = decodePsbt(signature);
  if (psbt === undefined) {
    return false;
  }
  const input = getPsbtAsJSON(psbt).inputs[0];
  if (input === undefined) {
    return false;
  }
  if (input.signed === false) {
    return false;
  }
  if (location !== input.location) {
    return false;
  }
  return true;
}

/**
 * Verify that message was signed by the provided public key.
 *
 * @param message   - Message to verify.
 * @param key       - Public key that signed the message.
 * @param signature - Signature to verify.
 * @param network   - Network the signature was signed for.
 */
export function validateOrditSignature(message: string, key: string, signature: string): boolean {
  const address = getAddresses(key, getBitcoinNetwork()).find((address) => address.format === "legacy");
  if (address === undefined) {
    return false;
  }
  return validateCoreSignature(message, address.value, Buffer.from(signature, "hex").toString("base64"));
}

/**
 * Verify that a message was signed by the provided address.
 *
 * @param message   - Message to verify.
 * @param address   - Address that signed the message.
 * @param signature - Signature to verify.
 */
export function validateCoreSignature(message: string, address: string, signature: string) {
  return verifyMessage(message, address, signature) || verifyFallback(message, address, signature);
}

/*
 |--------------------------------------------------------------------------------
 | Helpers
 |--------------------------------------------------------------------------------
 */

function verifyMessage(message: string, address: string, signature: string) {
  try {
    return verify(message, address, signature);
  } catch (err) {
    return false;
  }
}

function verifyFallback(message: string, address: string, signature: string) {
  const flags = [...Array(12).keys()].map((i) => i + 31);
  for (const flag of flags) {
    const flagByte = Buffer.alloc(1);
    flagByte.writeInt8(flag);

    let sigBuffer = Buffer.from(signature, "base64").slice(1);
    sigBuffer = Buffer.concat([flagByte, sigBuffer]);

    const candidateSig = sigBuffer.toString("base64");
    try {
      return verify(message, address, candidateSig);
    } catch (_) {
      continue;
    }
  }
  return false;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type Signature = {
  format: "psbt" | "ordit" | "core";
  value: string;
  pubkey?: string;
};

import { verify } from "bitcoinjs-message";

import { getBitcoinNetwork } from "../../../Libraries/Network";
import { getAddresses } from "../../../Utilities/Bip32";
import { decodePsbt, getPsbtAsJSON } from "../../../Utilities/PSBT";
import { IPFSOrder } from "../../IPFS";
import { OrderSignatureInvalid } from "../Exceptions/OrderException";
import { toMessageString } from "../Utilities/OrderMessage";

export function validateSignature(order: IPFSOrder) {
  switch (order.signature_format) {
    case "psbt": {
      validatePSBTSignature(order.signature, order.location);
      break;
    }
    case "ordit": {
      if (order.pubkey === undefined) {
        throw new OrderSignatureInvalid("Signature format 'ordit' requires a public key");
      }
      validateOrditSignature(toMessageString(order), order.pubkey, order.signature);
      break;
    }
    case "core": {
      validateCoreSignature(toMessageString(order), order.maker, order.signature);
      break;
    }
    default: {
      throw new OrderSignatureInvalid(`Signature format ${order.signature_format} is not supported`);
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Checks to see if all the inputs on a PSBT are signed.
 *
 * This is a very weak signature verification pattern that only checks to see if inputs
 * have been signed. It does not do any deeper verification than this as PSBT
 *
 * @param signature - Encoded PSBT to validate.
 * @param location  - Location to be confirmed in the first input of the PSBT.
 * @param network   - Network the PSBT was signed for.
 */
function validatePSBTSignature(signature: string, location: string): void {
  const psbt = decodePsbt(signature);
  if (psbt === undefined) {
    throw new Error("Could not decode PSBT");
  }
  const input = getPsbtAsJSON(psbt).inputs[0];
  if (input === undefined) {
    throw new Error("PSBT does not contain any inputs");
  }
  if (input.signed === false) {
    throw new Error("PSBT is not finalized");
  }
  if (location !== input.location) {
    throw new Error("PSBT signature does not match order location");
  }
}

/**
 * Verify that message was signed by the provided public key.
 *
 * @param message   - Message to verify.
 * @param key       - Public key that signed the message.
 * @param signature - Signature to verify.
 * @param network   - Network the signature was signed for.
 */
function validateOrditSignature(message: string, key: string, signature: string): void {
  const address = getAddresses(key, getBitcoinNetwork()).find((address) => address.format === "legacy");
  if (address === undefined) {
    throw new Error("Failed to retrieve legacy address from public key");
  }
  validateCoreSignature(message, address.value, Buffer.from(signature, "hex").toString("base64"));
}

/**
 * Verify that a message was signed by the provided address.
 *
 * @param message   - Message to verify.
 * @param address   - Address that signed the message.
 * @param signature - Signature to verify.
 */
function validateCoreSignature(message: string, address: string, signature: string): void {
  const verified = verify(message, address, signature, "", true);
  if (verified === false) {
    throw new Error("Message signature is invalid");
  }
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

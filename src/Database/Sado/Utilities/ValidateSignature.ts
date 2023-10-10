import { validateCoreSignature, validateOrditSignature, validatePSBTSignature } from "../../../Utilities/Signatures";
import { IPFSOrder } from "../../IPFS";
import { toMessageString } from "./OrderMessage";

export function validateOrderSignature(order: Omit<IPFSOrder, "cid">) {
  switch (order.signature_format) {
    case "psbt": {
      if (validatePSBTSignature(order.signature, order.location) === false) {
        throw new Error("Invalid PSBT signature");
      }
      break;
    }
    case "ordit": {
      if (order.pubkey === undefined) {
        throw new Error("Signature format 'ordit' requires a public key");
      }
      if (validateOrditSignature(toMessageString(order), order.pubkey, order.signature) === false) {
        throw new Error("Invalid ordit signature");
      }
      break;
    }
    case "core": {
      if (validateCoreSignature(toMessageString(order), order.maker, order.signature) === false) {
        throw new Error("Invalid core signature");
      }
      break;
    }
    default: {
      throw new Error(`Signature format '${order.signature_format}' not supported`);
    }
  }
}

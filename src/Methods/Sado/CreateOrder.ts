import { BadRequestError, method, NotFoundError } from "@valkyr/api";

import { sado } from "../../Libraries/Sado";
import { createOrderPsbt, params } from "../../Libraries/Sado/CreateOrderPsbt";
import { uploadOrder } from "../../Libraries/Sado/UploadOrder";
import { rpc } from "../../Services/Bitcoin";
import { getAddressType } from "../../Utilities/Bitcoin";
import { validateCoreSignature, validateOrditSignature, validatePSBTSignature } from "../../Utilities/Signatures";
import { parseLocation } from "../../Utilities/Transaction";

export default method({
  params,
  handler: async (params) => {
    const makerAddressType = getAddressType(params.order.maker);
    if (makerAddressType === undefined) {
      throw new BadRequestError("Provided maker address does not match supported address types");
    }

    // ### Validate Location
    // Ensure that the UTXO being spent exists and is confirmed.

    await validateLocation(params.order.location);

    // ### Validate Signature
    // Make sure that the order is verifiable by the API when it is received.

    let hasValidSignature = false;

    switch (params.signature.format) {
      case "psbt": {
        hasValidSignature = validatePSBTSignature(params.signature.value, params.order.location);
        break;
      }
      case "ordit": {
        if (params.signature.pubkey === undefined) {
          throw new BadRequestError("Signature format 'ordit' requires a public key");
        }
        hasValidSignature = validateOrditSignature(
          sado.order.toHex(params.order),
          params.signature.pubkey,
          params.signature.value
        );
        break;
      }
      case "core": {
        hasValidSignature = validateCoreSignature(
          sado.order.toHex(params.order),
          params.order.maker,
          params.signature.value
        );
        break;
      }
      default: {
        throw new BadRequestError(`Signature format ${params.signature.format} is not supported`);
      }
    }

    if (hasValidSignature === false) {
      throw new BadRequestError("Failed to validate signature");
    }

    // ### Store Order

    const cid = await uploadOrder(params);

    // ### Create PSBT
    // Create a PSBT that relays the order to the network. This stores the order
    // reference on the blockchain and can be processed by the API.

    const psbt = await createOrderPsbt(cid, params);

    return { cid, psbt: psbt.toBase64() };
  },
});

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function validateLocation(location: string): Promise<void> {
  const [txid, index] = parseLocation(location);
  const transaction = await rpc.transactions.getRawTransaction(txid, true);
  if (transaction === undefined) {
    throw new NotFoundError("Location transaction does not exist, or is not yet confirmed");
  }
  const vout = transaction.vout[index];
  if (vout === undefined) {
    throw new NotFoundError("Location transaction output does not exist");
  }
}

import { BadRequestError, method, NotFoundError } from "@valkyr/api";

import { validateOrderSignature } from "../../Database/SadoOrders";
import { createOrderPsbt, params } from "../../Libraries/Sado/CreateOrderPsbt";
import { getOrderIPFS, uploadOrder } from "../../Libraries/Sado/UploadOrder";
import { rpc } from "../../Services/Bitcoin";
import { getAddressType } from "../../Utilities/Bitcoin";
import { parseLocation } from "../../Utilities/Transaction";

export default method({
  params,
  handler: async (params) => {
    const makerAddressType = getAddressType(params.order.maker);
    if (makerAddressType === undefined) {
      throw new BadRequestError("Provided maker address does not match supported address types");
    }

    // ### Validate Order
    // Ensure that the order can be successfully validated by sado compliant
    // marketplace services.

    await validateLocation(params.order.location);
    validateOrderSignature(getOrderIPFS(params));

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

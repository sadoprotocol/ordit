import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getOrdersByAddress } from "../../Models/SadoOrders";
import { parseLocation } from "../../Models/SadoOrders/Utilities/ParseLocation";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getInscriptionsByOutpoint } from "../../Utilities/Transaction";

export const getSadoOrderbook = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    const orders = await getOrdersByAddress(address);
    for (const order of orders) {
      const [txid] = parseLocation(order.location);
      const meta = await getMetaFromTxId(txid);
      order.inscriptions = await getInscriptionsByOutpoint(order.location, meta);
    }
    return orders;
  },
});

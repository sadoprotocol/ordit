import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getOrderCount, getOrders } from "../../Models/SadoOrders";
import { parseLocation } from "../../Models/SadoOrders/Utilities/ParseLocation";
import { stripMongoId } from "../../Services/Mongo";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getPagination, pagination } from "../../Utilities/Pagination";
import { getInscriptionsByOutpoint } from "../../Utilities/Transaction";

export const getSadoOrderbook = method({
  params: Schema({
    address: string,
    pagination: pagination.optional(),
  }),
  handler: async ({ address, pagination }) => {
    const filter = { $or: [{ "orderbooks.address": address }, { maker: address }] };

    const orders = await getOrders(filter, getPagination(pagination));
    for (const order of orders) {
      const [txid] = parseLocation(order.location);
      const meta = await getMetaFromTxId(txid);
      order.inscriptions = await getInscriptionsByOutpoint(order.location, meta);
    }

    return {
      orders: orders.map(stripMongoId),
      pagination: {
        page: pagination?.page ?? 1,
        limit: 10,
        total: await getOrderCount(filter),
      },
    };
  },
});

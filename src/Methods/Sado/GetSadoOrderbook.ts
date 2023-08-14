import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { parseLocation } from "../../Database/SadoOrders/Utilities/ParseLocation";
import { stripMongoId } from "../../Services/Mongo";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { getPagination, pagination } from "../../Utilities/Pagination";
import { getInscriptionsByOutpoint } from "../../Utilities/Transaction";

export const getSadoOrderbook = method({
  params: Schema({
    address: string,
    sort: Schema({
      time: Schema.either("asc" as const, "desc" as const).optional(),
    }).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, sort, pagination }) => {
    const filter = { $or: [{ "orderbooks.address": address }, { maker: address }] };

    const orders = await db.orders.find(filter, {
      ...getPagination(pagination),
      sort: {
        "block.time": sort?.time === "asc" ? 1 : -1,
      },
    });
    for (const order of orders) {
      const [txid] = parseLocation(order.location);
      const meta = await getMetaFromTxId(txid);
      order.inscriptions = await getInscriptionsByOutpoint(order.location, meta);
    }

    return {
      orders: orders.map(stripMongoId),
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        total: await db.orders.count(filter),
      },
    };
  },
});

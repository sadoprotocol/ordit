import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { parseLocation } from "../../Database/SadoOrders/Utilities/ParseLocation";
import { satToUsd } from "../../Utilities/Bitcoin";
import { getPagination, pagination } from "../../Utilities/Pagination";

export const getSadoOrderbook = method({
  params: Schema({
    address: string,
    sort: Schema({
      time: Schema.either("asc" as const, "desc" as const).optional(),
    }).optional(),
    pagination: pagination.optional(),
  }),
  handler: async ({ address, sort, pagination }) => {
    const result: any[] = [];
    const filter = { $or: [{ "orderbooks.address": address }, { maker: address }] };

    const orders = await db.orders.find(filter, {
      ...getPagination(pagination),
      sort: {
        "block.time": sort?.time === "asc" ? 1 : -1,
      },
    });
    for (const order of orders) {
      const [txid, n] = parseLocation(order.location);
      result.push({
        ...order,
        price: {
          usd: satToUsd(order.cardinals),
        },
        inscriptions: await db.inscriptions.getInscriptionsByOutpoint(`${txid}:${n}`),
      });
    }

    return {
      orders: result,
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        total: await db.orders.count(filter),
      },
    };
  },
});

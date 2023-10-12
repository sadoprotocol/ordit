import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { satToUsd } from "../../Utilities/Bitcoin";
import { getPagination, pagination } from "../../Utilities/Pagination";

export default method({
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

    const orders = await db.sado.orders.find(filter, {
      ...getPagination(pagination),
      sort: {
        "block.time": sort?.time === "asc" ? 1 : -1,
      },
    });
    for (const order of orders) {
      result.push({
        ...order,
        price: {
          usd: satToUsd(order.cardinals),
        },
        inscriptions: await db.inscriptions.getInscriptionsByOutpoint(order.location),
      });
    }

    return {
      orders: result,
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? 10,
        total: await db.sado.orders.count(filter),
      },
    };
  },
});

import { method, NotFoundError, ServerError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getSadoEntry } from "../../Models/Sado";
import { getOfferStatus } from "../../Models/SadoOrders/Utilities/GetOfferStatus";
import { getOrderStatus } from "../../Models/SadoOrders/Utilities/GetOrderStatus";

export const getSadoStatus = method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const entry = await getSadoEntry({ cid });
    if (entry === undefined) {
      throw new NotFoundError();
    }
    if (entry.type === "order") {
      return getOrderStatus(entry);
    }
    if (entry.type === "offer") {
      return getOfferStatus(entry);
    }
    throw new ServerError(-32001, "Unknown sado entry type");
  },
});

import { method, NotFoundError, ServerError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { getOfferStatus, getOrderStatus } from "../../Database/Sado";

export default method({
  params: Schema({
    cid: string,
  }),
  handler: async ({ cid }) => {
    const sado = await db.sado.events.findOne({ cid });
    if (sado === undefined) {
      throw new NotFoundError();
    }
    if (sado.type === "order") {
      return getOrderStatus(sado);
    }
    if (sado.type === "offer") {
      return getOfferStatus(sado);
    }
    throw new ServerError(-32001, "Unknown sado entry type");
  },
});

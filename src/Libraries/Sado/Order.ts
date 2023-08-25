import Schema, { array, number, string, Type, unknown } from "computed-types";

import { schema } from "../Schema";

export const order = {
  schema: Schema({
    type: schema.sado.type,
    ts: number,
    location: schema.location,
    cardinals: number,
    maker: string,
    instant: string.optional(),
    expiry: number.optional(),
    satoshi: number.optional(),
    meta: unknown.record(string, unknown).optional(),
    orderbooks: array.of(string).optional(),
  }),
  toHex,
};

function toHex(order: OrderPayload): string {
  const data = { ...order };
  delete data.instant;
  return Buffer.from(JSON.stringify(data)).toString("hex");
}

export type OrderPayload = Type<typeof order.schema>;

export type OrderType = "buy" | "sell";

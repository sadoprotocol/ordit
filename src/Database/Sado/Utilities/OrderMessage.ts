export function toMessageString(order: OrderMessageData): string {
  const data: OrderMessageData = {
    type: order.type,
    ts: order.ts,
    location: order.location,
    cardinals: order.cardinals,
    maker: order.maker,
    expiry: order.expiry,
    satoshi: order.satoshi,
    meta: order.meta,
    orderbooks: order.orderbooks,
  };
  for (const key of ["expiry", "satoshi", "meta", "orderbooks"] as const) {
    if (order[key] === undefined) {
      delete order[key];
    }
  }
  return Buffer.from(JSON.stringify(data)).toString("hex");
}

export type OrderMessageData = {
  type: "buy" | "sell";
  ts: number;
  location: string;
  cardinals: number;
  maker: string;
  expiry?: number;
  satoshi?: number;
  meta?: Record<string, unknown>;
  orderbooks?: string[];
};

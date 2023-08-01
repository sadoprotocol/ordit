export function toMessageString(order: OrderPayload): string {
  return Buffer.from(
    JSON.stringify({
      type: order.type,
      ts: order.ts,
      location: order.location,
      cardinals: order.cardinals,
      maker: order.maker,
      expiry: order.expiry,
      satoshi: order.satoshi,
      meta: order.meta,
      orderbooks: order.orderbooks,
    })
  ).toString("hex");
}

export type OrderPayload = {
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

export function toMessageString(order: OrderPayload): string {
  const data: OrderPayload = { ...order };
  for (const key of ["expiry", "satoshi", "meta", "orderbooks"] as const) {
    if (order[key] === undefined) {
      delete order[key];
    }
  }
  return Buffer.from(JSON.stringify(data)).toString("hex");
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

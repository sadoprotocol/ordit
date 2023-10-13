export function parseOrderbookListing(value: string): [string, number] {
  const [address, price] = value.split(":");
  if (address === undefined) {
    throw new Error("Invalid orderbook listing");
  }
  return [address, price === undefined ? 600 : parseInt(price)];
}

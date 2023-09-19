import Schema, { number, string, Type } from "computed-types";

export const schema = {
  location: string.regexp(/^[a-f0-9]{64}:[0-9]+$/, "Expected value to be a valid utxo location in format of txid:vout"),
  signature: {
    format: Schema.either("psbt" as const, "ordit" as const, "core" as const).error(
      "Expected value to be 'psbt', 'ordit', or 'core'"
    ),
  },
  sort: Schema.record(
    string,
    Schema.either(
      1 as const,
      -1 as const,
      "asc" as const,
      "desc" as const,
      "ascending" as const,
      "descending" as const,
      Schema({ $meta: string })
    )
  ).optional(),
  sado: {
    type: Schema.either("sell" as const, "buy" as const).error("Expected value to be 'sell' or 'buy'"),
  },
  pagination: Schema({
    limit: number.gt(0).lt(100).optional(),
    prev: string.optional(),
    next: string.optional(),
    skip: number.optional(),
  }),
  addressTypes: Schema.either("legacy" as const, "nested-segwit" as const, "segwit" as const, "taproot" as const),
  network: Schema.either("mainnet" as const, "testnet" as const, "regtest" as const),
  onOrOff: Schema.either("on" as const, "off" as const),
  outputs: Schema({
    address: string,
    cardinals: number,
  }),
};

export type Sort = Type<typeof schema.sort>;

export type Pagination = Type<typeof schema.pagination>;

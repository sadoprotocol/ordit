import Schema, { string } from "computed-types";

export const schema = {
  location: string.regexp(/^[a-f0-9]{64}:[0-9]+$/, "Expected value to be a valid utxo location in format of txid:vout"),
  signature: {
    format: Schema.either("psbt" as const, "ordit" as const, "core" as const).error(
      "Expected value to be 'psbt', 'ordit', or 'core'"
    ),
  },
  sort: Schema.either("asc" as const, "desc" as const).error("Expected value to be 'asc' or 'desc'"),
  sado: {
    type: Schema.either("sell" as const, "buy" as const).error("Expected value to be 'sell' or 'buy'"),
  },
};

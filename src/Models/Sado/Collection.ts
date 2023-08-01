import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<SadoDocument>("sado");

export const registrar: CollectionRegistrar = {
  name: "sado",
  indexes: [
    [{ location: 1 }],
    [{ maker: 1 }],
    [{ orderbooks: 1 }],
    [{ "block.height": 1 }],
    [{ "offers.block.height": 1 }],
  ],
};

export type SadoDocument = {
  cid: string;
  type: Type;
  status: Status;
  location: string;
  cardinals: number;
  maker: string;
  offers: SadoOffer[];
  orderbooks: Orderbook[];
  instant?: string;
  expiry?: number;
  meta?: Record<string, unknown>;
  block: Block;
};

type Type = "buy" | "sell";

type Status = "pending" | "rejected" | "completed";

export type SadoOffer = {
  cid: string;
  origin: string;
  taker: string;
  cardinals: number;
  block: Block;
};

type Orderbook = {
  address: string;
  value: number;
};

type Block = {
  hash: string;
  height: number;
  txid: string;
  time: number;
};

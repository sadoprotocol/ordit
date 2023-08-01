import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<SadoDocument>("sado");

export const registrar: CollectionRegistrar = {
  name: "sado",
  indexes: [
    [{ cid: 1 }, { unique: true }],
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
  rejection?: any;
};

type Type = "buy" | "sell";

type Status = "incoming" | "rejected" | "pending" | "completed";

export type SadoOffer = {
  cid: string;
  origin: string;
  taker: string;
  offer: string;
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

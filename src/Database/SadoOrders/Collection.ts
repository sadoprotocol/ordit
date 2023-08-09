import { CollectionRegistrar, mongo } from "../../Services/Mongo";
import { Inscription } from "../Inscriptions";

export const collection = mongo.db.collection<SadoOrder>("sado_orders");

export const registrar: CollectionRegistrar = {
  name: "sado_orders",
  indexes: [
    [{ cid: 1 }, { unique: true }],
    [{ location: 1 }],
    [{ maker: 1 }],
    [{ orderbooks: 1 }],
    [{ "block.height": 1 }],
    [{ "offers.block.height": 1 }],
  ],
};

export type SadoOrder = {
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
  inscriptions?: Inscription[];
};

export type Type = "buy" | "sell" | "collection";

type Status = "incoming" | "pending";

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

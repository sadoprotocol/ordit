import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<IPFSDocument>("ipfs");

export const registrar: CollectionRegistrar = {
  name: "ipfs",
  indexes: [[{ cid: 1 }], [{ location: 1 }], [{ maker: 1 }]],
};

export type IPFSDocument = IPFSOrder | IPFSOffer | IPFSCollection | IPFSImage;

export type IPFSOrder = {
  cid: string;
  ts: number;
  type: OrderType;
  location: string;
  maker: string;
  cardinals: number;
  instant?: string;
  expiry?: number;
  satoshi?: number;
  meta?: Record<string, unknown>;
  orderbooks?: string[];
  signature: string;
  signature_format?: string;
  desc?: string;
  pubkey?: string;
};

export type IPFSOffer = {
  cid: string;
  ts: number;
  origin: string;
  offer: string;
  offer_format?: string;
  taker: string;
};

export type IPFSCollection = {
  cid: string;
  id: string;
  owner: string;
  name: string;
  title: string;
  intro: string;
  description: string;
  cover: string;
  banner: string;
};

export type IPFSImage = {
  cid: string;
  img: string;
};

export type OrderType = "sell" | "buy";

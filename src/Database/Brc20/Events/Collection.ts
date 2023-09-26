import { CollectionRegistrar, mongo } from "../../../Services/Mongo";
import { TokenDeployedEvent, TokenMintedEvent, TokenTransferedEvent } from "./Events";

export const collection = mongo.db.collection<Brc20Event>("brc20_events");

export const registrar: CollectionRegistrar = {
  name: "brc20_events",
  indexes: [
    [{ "meta.slug": 1 }],
    [{ "meta.inscription": 1 }, { unique: true }],
    [{ "meta.address": 1 }],
    [{ "meta.block": 1, "meta.number": 1 }],
    [{ number: 1 }, { unique: true }],
  ],
};

export type Brc20Event = TokenDeployed | TokenMinted | TokenTransfered;

export type TokenDeployed = TokenDeployedEvent & EventMeta;

export type TokenMinted = TokenMintedEvent & EventMeta;

export type TokenTransfered = TokenTransferedEvent & EventMeta;

type EventMeta = {
  meta: {
    slug: string;
    inscription: string;
    address: string;
    block: number;
    number: number;
    timestamp: number;
  };
  number: number;
};

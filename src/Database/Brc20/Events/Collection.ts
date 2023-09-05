import { CollectionRegistrar, mongo } from "../../../Services/Mongo";
import { TokenDeployedEvent, TokenMintedEvent, TokenTransferedEvent } from "./Events";

export const collection = mongo.db.collection<Brc20Event>("brc20_events");

export const registrar: CollectionRegistrar = {
  name: "brc20_events",
  indexes: [
    [{ "meta.slug": 1 }],
    [{ "meta.inscription": 1 }],
    [{ "meta.address": 1 }],
    [{ "meta.block": 1, "meta.number": 1 }],
  ],
};

export type Brc20Event = TokenDeployed | TokenMinted | TokenTransfered;

type TokenDeployed = TokenDeployedEvent & EventMeta;

type TokenMinted = TokenMintedEvent & EventMeta;

type TokenTransfered = TokenTransferedEvent & EventMeta;

type EventMeta = {
  meta: {
    slug: string;
    inscription: string;
    address: string;
    block: number;
    number: number;
    timestamp: number;
  };
};

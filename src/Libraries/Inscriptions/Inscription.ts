import { db } from "~Database";
import { OrdInscriptionData } from "~Services/Ord";
import { parseLocation } from "~Utilities/Transaction";

import { Envelope } from "./Envelope";

export class Inscription {
  readonly id: string;
  readonly parents?: string[];
  readonly delegate?: string;
  readonly children?: string[];
  readonly genesis: string;
  readonly creator: string;
  readonly owner: string;
  readonly media: InscriptionMedia;
  readonly number: number;
  readonly sequence: number;
  readonly height: number;
  readonly fee: number;
  readonly sat: number;
  readonly outpoint: string;
  readonly timestamp: number;
  readonly meta?: Object;
  readonly oip?: Object;

  constructor(data: InscriptionData) {
    this.id = data.id;
    this.parents = data.parents;
    this.delegate = data.delegate;
    this.children = data.children;
    this.genesis = data.genesis;
    this.creator = data.creator;
    this.owner = data.owner;
    this.media = data.media;
    this.number = data.number;
    this.sequence = data.sequence;
    this.height = data.height;
    this.fee = data.fee;
    this.sat = data.sat;
    this.outpoint = data.outpoint;
    this.timestamp = data.timestamp;
    this.meta = data.meta;
    this.oip = data.oip;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Parsers
 |--------------------------------------------------------------------------------
 */

export async function getInscriptionFromEnvelope(
  envelope: Envelope,
  ord: Map<string, OrdInscriptionData>,
): Promise<Inscription | undefined> {
  const ordData = ord.get(envelope.id);
  if (ordData === undefined) {
    return undefined;
  }

  const [locationTxid, locationN] = parseLocation(ordData.satpoint);

  return new Inscription({
    id: envelope.id,
    parents: envelope.parents ?? [],
    delegate: envelope.delegate,
    children: ordData.children ?? [],
    genesis: envelope.txid,
    creator: await getInscriptionCreator(envelope.txid),
    owner: await getInscriptionOwner(locationTxid, locationN),
    media: {
      type: envelope.media.type ?? "",
      encoding: envelope.media.encoding ?? "",
      charset: envelope.media.charset,
      mime: {
        type: envelope.media.mimeType,
        subtype: envelope.media.mimeSubtype,
      },
      content: envelope.content?.body ?? "",
      size: envelope.content?.size ?? 0,
    },
    number: ordData.number,
    sequence: ordData.inscription_sequence,
    height: ordData.height,
    fee: ordData.fee,
    sat: ordData.sat,
    outpoint: `${locationTxid}:${locationN}`,
    timestamp: ordData.timestamp,
    meta: envelope.meta,
    oip: envelope.oip,
  });
}

async function getInscriptionCreator(txid: string) {
  const data = await db.outputs.findOne({ "vout.txid": txid, "vout.n": 0 });
  return data?.addresses[0] ?? "";
}

async function getInscriptionOwner(txid: string, n: number) {
  const data = await db.outputs.findOne({ "vout.txid": txid, "vout.n": n });
  return data?.addresses[0] ?? "";
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type InscriptionData = {
  id: string;
  parents?: string[];
  delegate?: string;
  children?: string[];
  genesis: string;
  creator: string;
  owner: string;
  media: InscriptionMedia;
  number: number;
  sequence: number;
  height: number;
  fee: number;
  sat: number;
  outpoint: string;
  timestamp: number;
  meta: Object;
  oip?: Object;
};

type InscriptionMedia = {
  type: string;
  encoding: string;
  charset: string;
  mime: {
    type: string;
    subtype: string;
  };
  content: string;
  size: number;
};

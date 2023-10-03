import { db } from "../../Database";
import { RawTransaction } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { parseLocation } from "../../Utilities/Transaction";
import { Envelope } from "./Envelope";

export class Inscription {
  readonly id: string;
  readonly genesis: string;
  readonly creator: string;
  readonly owner: string;
  readonly media: InscriptionMedia;
  readonly number: number;
  readonly height: number;
  readonly fee: number;
  readonly sat: number;
  readonly outpoint: string;
  readonly timestamp: number;
  readonly meta?: Object;
  readonly oip?: Object;

  private constructor(data: InscriptionData) {
    this.id = data.id;
    this.genesis = data.genesis;
    this.creator = data.creator;
    this.owner = data.owner;
    this.media = data.media;
    this.number = data.number;
    this.height = data.height;
    this.fee = data.fee;
    this.sat = data.sat;
    this.outpoint = data.outpoint;
    this.timestamp = data.timestamp;
    this.meta = data.meta;
    this.oip = data.oip;
  }

  static async fromTransaction(tx: RawTransaction) {
    const envelope = Envelope.fromTransaction(tx);
    if (envelope && envelope.isValid) {
      const id = `${tx.txid}i0`;

      const ordData = await ord.getInscriptionsForIds([id]).then((data) => data[0]);
      if (ordData === undefined) {
        return undefined;
      }

      const [txid, vout] = parseLocation(ordData.satpoint);

      return new Inscription({
        id,
        genesis: tx.txid,
        creator: await getInscriptionCreator(tx.txid),
        owner: await getInscriptionOwner(txid, vout),
        media: {
          type: envelope.type ?? "",
          charset: envelope.media.charset,
          mime: {
            type: envelope.media.type,
            subtype: envelope.media.subtype,
          },
          content: envelope.content?.body ?? "",
          size: envelope.content?.size ?? 0,
        },
        number: ordData.number,
        height: ordData.genesis_height,
        fee: ordData.genesis_fee,
        sat: ordData.sat,
        outpoint: `${txid}:${vout}`,
        timestamp: ordData.timestamp,
        meta: envelope.meta,
        oip: envelope.oip,
      });
    }
  }
}

/*
 |--------------------------------------------------------------------------------
 | Parsers
 |--------------------------------------------------------------------------------
 */

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
  genesis: string;
  creator: string;
  owner: string;
  media: InscriptionMedia;
  number: number;
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
  charset: string;
  mime: {
    type: string;
    subtype: string;
  };
  content: string;
  size: number;
};

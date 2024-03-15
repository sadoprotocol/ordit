import { script } from "bitcoinjs-lib";

import { isCoinbase, RawTransaction } from "../../Services/Bitcoin";
import { getMetaFromWitness } from "./Oip";

const PROTOCOL_ID = "6f7264";

const ENVELOPE_START_TAG = 0;
const ENVELOPE_END_TAG = 104;

const PROTOCOL_TAG = 99;
const TYPE_TAG = 81;
const PARENT_TAG = 83;
const META_TAG = 85;
const BODY_TAG = 0;

type EnvelopeData = number | Buffer;

/*
 |--------------------------------------------------------------------------------
 | Envelope
 |--------------------------------------------------------------------------------
 */

export class Envelope {
  readonly id: string;
  readonly protocol?: string;
  readonly type?: string;
  readonly parent?: string;
  readonly content?: {
    size: number;
    body: string;
  };
  readonly media: {
    type: string;
    charset: string;
    mimeType: string;
    mimeSubtype: string;
  };
  readonly meta: object;

  constructor(
    readonly txid: string,
    readonly data: EnvelopeData[],
    readonly oip?: object,
    readonly index: number = 0,
  ) {
    this.id = `${txid}i${index}`;
    this.protocol = getEnvelopeProtocol(data);
    this.type = getEnvelopeType(data);
    this.parent = getParent(data);
    this.content = getEnvelopeContent(data);
    this.media = getMediaMeta(this.type);
    this.meta = getEnvelopeMeta(data) ?? {};
  }

  /**
   * Return a inscription envelope from a transaction or undefined if no valid
   * envelope is present.
   *
   * @param tx - Raw bitcoin transaction to search for an inscription envelope
   */
  static fromTransaction(tx: RawTransaction) {
    const envelopes = getEnvelopesDataFromTx(tx);
    if (envelopes && envelopes.length > 0) {
      return envelopes.map(([data, oip], index) => {
        if (data) {
          return new Envelope(tx.txid, data, oip, index);
        }
        return undefined;
      });
    }
  }

  static fromTxinWitness(txid: string, txinwitness: string[]) {
    const envelopes = getEnvelopesFromTxinWitness(txinwitness);
    if (envelopes && envelopes.length > 0) {
      return envelopes.map(([data, oip], index) => {
        if (data) {
          return new Envelope(txid, data, oip, index);
        }
        return undefined;
      });
    }
  }

  get isValid() {
    return this.protocol === "ord";
  }

  get size() {
    return this.content?.size ?? 0;
  }

  get body() {
    return this.content?.body ?? "";
  }

  toJSON() {
    return {
      protocol: this.protocol,
      type: this.type,
      parent: this.parent,
      size: this.size,
      meta: this.meta,
      oip: this.oip,
      body: this.body,
    };
  }
}

/*
 |--------------------------------------------------------------------------------
 | Parsers
 |--------------------------------------------------------------------------------
 */

function getEnvelopeProtocol(data: EnvelopeData[]) {
  const startIndex = data.indexOf(PROTOCOL_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const protocol = data[startIndex + 1];
  if (!protocol || !isBuffer(protocol)) {
    return undefined;
  }
  return protocol.toString("utf-8");
}

function getEnvelopeType(data: EnvelopeData[]) {
  const startIndex = data.indexOf(TYPE_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const type = data[startIndex + 1];
  if (!type || !isBuffer(type)) {
    return undefined;
  }
  return type.toString("utf-8");
}

function getEnvelopeContent(data: EnvelopeData[]) {
  const startIndex = data.indexOf(BODY_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const content: Buffer[] = [];
  for (const op of data.slice(startIndex + 1)) {
    if (!isBuffer(op)) {
      break;
    }
    content.push(op);
  }
  const buffer = Buffer.concat(content);
  return {
    size: buffer.length,
    body: buffer.toString("base64"),
  };
}

function getParent(data: EnvelopeData[]) {
  const startIndex = data.indexOf(PARENT_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const parent = data[startIndex + 1];
  if (!parent || !isBuffer(parent)) {
    return undefined;
  }
  return `${parent.reverse().toString("hex")}i0`;
}

function getEnvelopeMeta(data: EnvelopeData[]) {
  const startIndex = data.indexOf(META_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const content: Buffer[] = [];
  for (const op of data.slice(startIndex + 1)) {
    if (!isBuffer(op)) {
      break;
    }
    content.push(op);
  }
  try {
    return JSON.parse(Buffer.concat(content).toString("utf-8"));
  } catch (err) {
    return undefined;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Extractor
 |--------------------------------------------------------------------------------
 */

function getEnvelopesDataFromTx(tx: RawTransaction): [EnvelopeData[]?, any?][] | undefined {
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    if (vin.txinwitness) {
      return getEnvelopesFromTxinWitness(vin.txinwitness);
    }
  }
}

function getEnvelopesFromTxinWitness(txinwitness: string[]): [EnvelopeData[]?, any?][] | undefined {
  for (const witness of txinwitness) {
    if (witness.includes(PROTOCOL_ID)) {
      const data = script.decompile(Buffer.from(witness, "hex"));
      if (data) {
        const oip = getMetaFromWitness(txinwitness);
        if (oip) {
          return getEnvelopes(data).map((envelope) => {
            return [envelope, oip];
          });
        }
        return getEnvelopes(data).map((envelope) => {
          return [envelope];
        });
      }
    }
  }
}

/**
 * Get raw envelope data from a decompiled witness script.
 *
 * @remarks Strip out the envelope start and end tags as the BODY_TAG shared the
 *          same value as the ENVELOPE_START_TAG.
 *
 * @param data - Witness script to extract envelope from.
 */
function getEnvelopes(data: EnvelopeData[]): EnvelopeData[][] {
  const envelopes: EnvelopeData[][] = [];

  let startIndex = -1;
  let endIndex = -1;

  for (let i = 0; i < data.length; i += 1) {
    if (data[i] === ENVELOPE_START_TAG && startIndex === -1) {
      startIndex = i;
      continue;
    }

    if (data[i] === ENVELOPE_END_TAG && startIndex !== -1) {
      endIndex = i;

      envelopes.push(data.slice(startIndex + 1, endIndex));

      // reset for the next envelope
      startIndex = -1;
      endIndex = -1;
    }
  }

  return envelopes;
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getMediaMeta(data: string = "") {
  const [type, format = ""] = data.split(";");
  const [mimeType, mimeSubtype] = type.split("/");
  const [, charset = ""] = format.split("=");
  return {
    type,
    charset,
    mimeType,
    mimeSubtype,
  };
}

function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

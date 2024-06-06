import { script } from "bitcoinjs-lib";

import { isCoinbase, RawTransaction } from "../../Services/Bitcoin";
import { getMetaFromWitness } from "./Oip";

const PROTOCOL_ID = "6f7264";

const ENVELOPE_START_TAG = 0;
const ENVELOPE_END_TAG = 104;

const PROTOCOL_TAG = 99;
const TYPE_TAG = 81;
const ENCODING_TAG = 89;
const PARENT_TAG = 83;
const META_TAG = 85;
const BODY_TAG = 0;
const DELEGATE_TAG = 91;

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
  readonly encoding?: string;
  readonly parents?: string[];
  readonly delegate?: string;
  readonly content?: {
    size: number;
    body: string;
  };
  readonly media: {
    type: string;
    encoding: string;
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
    this.encoding = getEnvelopeEncoding(data);
    this.parents = getParents(data);
    this.delegate = getDelegateTag(data);
    this.content = getEnvelopeContent(data);
    this.media = getMediaMeta(this.type, this.encoding);
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

  static fromTxinWitness(txid: string, txinwitness: string[], currentEnvelopeIndex: number) {
    const envelopes = getEnvelopesFromTxinWitness(txinwitness);
    if (envelopes && envelopes.length > 0) {
      return envelopes.map(([data, oip], index) => {
        const envelopeIndex = index + currentEnvelopeIndex;
        if (data) {
          return new Envelope(txid, data, oip, envelopeIndex);
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
      parents: this.parents,
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

function getEnvelopeEncoding(data: EnvelopeData[]) {
  const startIndex = data.indexOf(ENCODING_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const encoding = data[startIndex + 1];
  if (!encoding || !isBuffer(encoding)) {
    return undefined;
  }
  return encoding.toString("utf-8");
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

function getParents(data: EnvelopeData[]) {
  const parents = [];
  let scanIndex = 0;

  while (data.indexOf(PARENT_TAG, scanIndex) !== -1) {
    const parentIndex = data.indexOf(PARENT_TAG, scanIndex);
    const parent = getParent(data[parentIndex + 1]);
    if (parent) {
      parents.push(parent);
    }
    scanIndex += 1;
  }
  return parents;
}

function getParent(parentData: EnvelopeData) {
  if (!isBuffer(parentData)) {
    return undefined;
  }
  const txid = parentData.subarray(0, 32).reverse().toString("hex");
  const inscription_index = parseInt(parentData.subarray(32).reverse().toString("hex"), 16);
  return `${txid}i${inscription_index ?? 0}`;
}

function getDelegateTag(data: EnvelopeData[]) {
  const startIndex = data.indexOf(DELEGATE_TAG);
  if (startIndex === -1) {
    return undefined;
  }
  const delegate = data[startIndex + 1];
  if (!delegate || !isBuffer(delegate)) {
    return undefined;
  }
  return `${delegate.reverse().toString("hex")}i0`;
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
  const envelopes = [];
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    if (vin.txinwitness) {
      const envelope = getEnvelopesFromTxinWitness(vin.txinwitness);
      if (envelope) {
        envelopes.push(...envelope);
      }
    }
  }
  return envelopes;
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

function getMediaMeta(dataType: string = "", dataEncoding: string = "") {
  const [type, format = ""] = dataType.split(";");
  const [mimeType, mimeSubtype] = type.split("/");
  const [, charset = ""] = format.split("=");
  return {
    type,
    encoding: dataEncoding,
    charset,
    mimeType,
    mimeSubtype,
  };
}

function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

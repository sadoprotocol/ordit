import { script } from "bitcoinjs-lib";

import { config } from "../Config";
import { isCoinbase, RawTransaction } from "../Services/Bitcoin";
import { getMetaFromWitness } from "./Oip";
import { parseLocation } from "./Transaction";

export const INSCRIPTION_EPOCH_BLOCK =
  config.network === "mainnet" ? 767_429 : config.network === "testnet" ? 2_413_342 : 0;

const ORD_WITNESS = "6f7264";

const OP_FALSE = 0;
const OP_IF = 99;
const OP_PUSH_0 = 0;
const OP_PUSH_1 = 81;
const OP_ENDIF = 104;

export function getIdFromOutpoint(outpoint: string) {
  return outpoint.replace(":", "i");
}

export function getLocationFromId(id: string) {
  return parseLocation(getOutpointFromId(id));
}

export function getOutpointFromId(id: string) {
  const outpoint = id.split("");
  outpoint[id.length - 2] = ":";
  return outpoint.join("");
}

export function getRawInscriptionContent(tx: RawTransaction) {
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    if (vin.txinwitness) {
      for (const witness of vin.txinwitness) {
        if (witness.includes(ORD_WITNESS)) {
          const data = script.decompile(Buffer.from(witness, "hex"));
          if (!data) {
            continue;
          }
          return getEnvelope(data);
        }
      }
    }
  }
  return undefined;
}

export function getInscriptionContent(tx: RawTransaction) {
  for (const vin of tx.vin) {
    if (isCoinbase(vin)) {
      continue;
    }
    if (vin.txinwitness) {
      const media = getInscriptionFromWitness(vin.txinwitness);
      if (media) {
        const meta = getMetaFromWitness(vin.txinwitness);
        if (meta) {
          return { media, meta };
        }
        return { media };
      }
    }
  }
  return undefined;
}

export function getInscriptionFromWitness(txinwitness: string[]) {
  for (const witness of txinwitness) {
    if (witness.includes(ORD_WITNESS)) {
      const data = script.decompile(Buffer.from(witness, "hex"));
      if (!data) {
        continue;
      }

      const envelope = getInscriptionEnvelope(data);
      if (envelope === undefined) {
        continue; // failed to identify inscription envelope
      }

      return { type: envelope.type, content: envelope.content };
    }
  }
}

function getInscriptionEnvelope(data: (number | Buffer)[]) {
  const envelope = getEnvelope(data);
  if (envelope === undefined) {
    return undefined;
  }

  const protocol = getInscriptionEnvelopeProtocol(envelope);
  if (protocol !== "ord") {
    return undefined;
  }

  const type = getInscriptionEnvelopeType(envelope);
  if (type === undefined) {
    return undefined;
  }

  const content = getInscriptionEnvelopeContent(envelope);
  if (content === undefined) {
    return undefined;
  }

  return { protocol, type, content };
}

function getEnvelope(data: (number | Buffer)[]): (number | Buffer)[] | undefined {
  let startIndex = -1;
  let endIndex = -1;

  let index = 0;
  for (const op of data) {
    const started = startIndex !== -1;
    if (started === false && op === OP_FALSE) {
      startIndex = index;
      continue;
    }
    if (op === OP_ENDIF) {
      if (started === false) {
        return [];
      }
      endIndex = index;
      break;
    }
    index += 1;
  }

  return data.slice(startIndex, endIndex + 2);
}

function getInscriptionEnvelopeProtocol(envelope: (number | Buffer)[]) {
  if (envelope.shift() !== OP_FALSE) {
    return undefined;
  }
  if (envelope.shift() !== OP_IF) {
    return undefined;
  }
  const protocol = envelope.shift();
  if (!protocol || !isBuffer(protocol)) {
    return undefined;
  }
  return protocol.toString("utf-8");
}

function getInscriptionEnvelopeType(envelope: (number | Buffer)[]) {
  if (hasOpCode(envelope, OP_PUSH_1) === false) {
    return undefined;
  }
  const type = envelope.shift();
  if (!type || !isBuffer(type)) {
    return undefined;
  }
  return type.toString("utf-8");
}

function getInscriptionEnvelopeContent(envelope: (number | Buffer)[]) {
  const push = envelope.shift();
  if (push !== OP_PUSH_0) {
    return undefined;
  }
  const content: Buffer[] = [];
  for (const op of envelope) {
    if (op === OP_ENDIF) {
      break;
    }
    if (!isBuffer(op)) {
      return undefined;
    }
    content.push(op);
  }
  return Buffer.concat(content);
}

function hasOpCode(envelope: (number | Buffer)[], opcode: number) {
  let push = envelope.shift();
  while (push !== opcode) {
    push = envelope.shift();
    if (push === undefined) {
      return false;
    }
  }
  return true;
}

export function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

import { script } from "bitcoinjs-lib";

import { isCoinbase, RawTransaction } from "../Services/Bitcoin";
import { getMetaFromWitness } from "./Oip";
import { parseLocation } from "./Transaction";

const ORD_WITNESS = "6f7264";

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

      const typeIndex = data.findIndex((chunk) => chunk === 81);

      const contentData = data.slice(typeIndex + 3);
      const contentIndex = contentData.slice(
        0,
        contentData.findIndex((chunk) => chunk === 104)
      );

      const type = data.slice(typeIndex + 1, typeIndex + 2)[0].toString();
      const content = contentIndex
        .map((chunk) => {
          if (typeof chunk === "number") {
            return "";
          }
          return chunk.toString("base64");
        })
        .join("");

      return { type, content, length: Buffer.from(content, "base64").length };
    }
  }
}

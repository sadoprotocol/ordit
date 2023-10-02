import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { Inscription } from "../../Database/Inscriptions";
import { schema } from "../../Libraries/Schema";
import { btcToSat } from "../../Utilities/Bitcoin";
import { parseLocation } from "../../Utilities/Transaction";

export default method({
  params: Schema({
    filter: Schema({
      creator: string.optional(),
      owner: string.optional(),
      mimeType: string.optional(),
      mimeSubtype: string.optional(),
      outpoint: string.optional(),
    }).optional(),
    include: schema.include("value"),
    sort: schema.sort.optional(),
    pagination: schema.pagination.optional(),
  }),
  handler: async ({ filter = {}, include, sort = {}, pagination = {} }) => {
    const result = await db.inscriptions.findPaginated({
      ...pagination,
      filter,
      sort,
      transform: (inscription) => {
        inscription.mediaContent = `${config.api.uri}/content/${inscription.id}`;
      },
    });
    if (include?.includes("value")) {
      result.documents = await includeInscriptionValue(result.documents);
    }
    return {
      inscriptions: result.documents,
      pagination: result.pagination,
    };
  },
});

async function includeInscriptionValue(inscriptions: (Inscription & { $cursor: string })[]): Promise<WithValue[]> {
  const data = await db.outputs.find({
    $or: inscriptions.map((inscription) => {
      const [txid, n] = parseLocation(inscription.outpoint);
      return { "vout.txid": txid, "vout.n": n };
    }),
  });
  return inscriptions.map((inscription) => {
    const utxo = data.find((output) => `${output.vout.txid}:${output.vout.n}` === inscription.outpoint);
    if (utxo) {
      return {
        ...inscription,
        value: btcToSat(utxo.value),
      };
    }
    return inscription;
  }) as WithValue[];
}

type WithValue = Inscription & { $cursor: string; value: number };

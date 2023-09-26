import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { rpc } from "../../Services/Bitcoin";
import { getInscriptionContent, getRawInscriptionContent, isBuffer } from "../../Utilities/Inscriptions";

export default method({
  params: Schema({
    genesis: string,
  }),
  handler: async ({ genesis }) => {
    const tx = await rpc.transactions.getRawTransaction(genesis, true);
    if (tx === undefined) {
      throw new NotFoundError("Transaction not found");
    }
    const envelope = getRawInscriptionContent(tx);
    if (envelope === undefined) {
      throw new NotFoundError("Inscription not found");
    }
    const data = getInscriptionContent(tx);
    return {
      envelope: envelope.map((chunk) => {
        if (typeof chunk === "number") {
          return chunk;
        }
        if (isBuffer(chunk)) {
          return chunk.toString("utf-8");
        }
        return chunk;
      }),
      media: {
        type: data?.media.type,
        content: data?.media.content.toString("utf-8"),
        length: data?.media.content.length,
      },
      tx,
    };
  },
});

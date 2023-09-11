import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { rpc } from "../../Services/Bitcoin";
import { getInscriptionContent } from "../../Utilities/Inscriptions";

export default method({
  params: Schema({
    height: number,
  }),
  handler: async ({ height }) => {
    const result = [];
    const block = await rpc.blockchain.getBlock(height, 2);
    for (const tx of block.tx) {
      const data = getInscriptionContent(tx);
      if (data === undefined) {
        continue;
      }
      result.push({
        id: `${tx.txid}i0`,
        genesis: tx.txid,
        ...data,
        media: {
          type: data.media.type,
          content: data.media.content.toString("base64"),
          length: data.media.content.length,
        },
      });
    }
    return result;
  },
});

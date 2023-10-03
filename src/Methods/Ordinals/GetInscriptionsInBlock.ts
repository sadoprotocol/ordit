import { method } from "@valkyr/api";
import Schema, { number } from "computed-types";

import { Inscription } from "../../Libraries/Inscriptions/Inscription";
import { rpc } from "../../Services/Bitcoin";

export default method({
  params: Schema({
    height: number,
  }),
  handler: async ({ height }) => {
    const result: Inscription[] = [];
    const block = await rpc.blockchain.getBlock(height, 2);
    for (const tx of block.tx) {
      const inscription = Inscription.fromTransaction(tx);
      if (inscription === undefined) {
        continue;
      }
      result.push(inscription);
    }
    return result;
  },
});

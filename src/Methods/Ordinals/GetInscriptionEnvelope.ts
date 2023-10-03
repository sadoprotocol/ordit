import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { Envelope } from "../../Libraries/Inscriptions/Envelope";
import { rpc } from "../../Services/Bitcoin";

export default method({
  params: Schema({
    genesis: string,
  }),
  handler: async ({ genesis }) => {
    const tx = await rpc.transactions.getRawTransaction(genesis, true);
    if (tx === undefined) {
      throw new NotFoundError("Transaction not found");
    }
    const envelope = Envelope.fromTransaction(tx);
    if (envelope === undefined) {
      return new NotFoundError("Transaction does not have inscription envelope");
    }
    return envelope.toJSON();
  },
});

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
    const envelopes = Envelope.fromTransaction(tx);
    if (envelopes === undefined) {
      return new NotFoundError("Transaction does not have any inscription envelopes");
    }
    const envelopes_json = envelopes.map((envelope) => envelope?.toJSON());
    return envelopes_json;
  },
});

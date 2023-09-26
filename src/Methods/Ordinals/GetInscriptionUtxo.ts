import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { parseLocation } from "../../Utilities/Transaction";

export default method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    const inscription = await db.inscriptions.getInscriptionById(id);
    if (inscription === undefined) {
      throw new NotFoundError("Inscription not found");
    }

    const [txid, n] = parseLocation(inscription.outpoint);
    const output = await db.outputs.getByLocation(txid, n);
    if (output === undefined) {
      throw new NotFoundError("Output not found");
    }

    const tx = await rpc.transactions.getRawTransaction(txid, true);
    if (tx === undefined) {
      throw new NotFoundError("Blockchain transaction not found");
    }

    const vout = tx.vout[n];
    if (vout === undefined) {
      throw new NotFoundError("Blockchain vout not found");
    }

    const height = await rpc.blockchain.getBlockCount();

    return {
      txid,
      n,
      sats: btcToSat(vout.value),
      scriptPubKey: vout.scriptPubKey,
      safeToSpend: false,
      confirmations: height - output.vout.block.height + 1,
    };
  },
});

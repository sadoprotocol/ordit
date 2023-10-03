import { method, NotFoundError } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";
import { parseLocation } from "../../Utilities/Transaction";

export default method({
  params: Schema({
    id: string,
  }),
  handler: async ({ id }) => {
    return getInscriptionUtxo(id);
  },
});

async function getInscriptionUtxo(id: string, attempts = 0) {
  const inscription = await db.inscriptions.getInscriptionById(id);
  if (inscription === undefined) {
    throw new NotFoundError("Inscription not found");
  }

  const [txid, n] = parseLocation(inscription.outpoint);
  const output = await db.outputs.getByLocation(txid, n);
  if (output === undefined) {
    throw new NotFoundError("Output not found");
  }

  if (output.vin !== undefined) {
    const data = await ord.getInscription(inscription.id);
    if (data === undefined || attempts > 3) {
      throw new Error("Unable to resolve utxo from inscription state");
    }
    const [txid, n] = data.satpoint.split(":");
    await db.inscriptions.updateOne(
      { id: inscription.id },
      {
        $set: {
          owner: data.address,
          outpoint: `${txid}:${n}`,
        },
      },
    );
    return getInscriptionUtxo(id, attempts + 1);
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
}

import { BadRequestError, method } from "@valkyr/api";
import Schema, { boolean, number, string } from "computed-types";

import { db } from "../../Database";
import { DecodedTransaction, rpc } from "../../Services/Bitcoin";

export default method({
  params: Schema({
    hex: string,
    maxFeeRate: number.optional(),
    validate: boolean.optional(),
  }),
  handler: async ({ hex, maxFeeRate, validate = false }) => {
    const tx = await rpc.transactions.decodeRawTransaction(hex);
    if (validate === true) {
      await validateUtxos(tx);
    }
    const result = await rpc.transactions.sendRawTransaction(hex, maxFeeRate);
    if (result === undefined) {
      throw new BadRequestError("Failed to relay transaction", { result });
    }
    await setSpentUtxos(tx);
    return result;
  },
});

async function validateUtxos(tx: DecodedTransaction) {
  const errors: {
    missing: string[];
    spent: string[];
  } = {
    missing: [],
    spent: [],
  };
  for (const vin of tx.vin) {
    const utxo = await db.outputs.findOne({ "vout.txid": vin.txid, "vout.n": vin.vout });
    if (utxo === undefined) {
      errors.missing.push(`${vin.txid}:${vin.vout}`);
      continue;
    }
    if (utxo.spent === true || utxo.vin !== undefined) {
      errors.spent.push(`${vin.txid}:${vin.vout}`);
      continue;
    }
  }
  if (errors.missing.length > 0 || errors.spent.length > 0) {
    throw new BadRequestError("Transaction validation failed", errors);
  }
}

async function setSpentUtxos(tx: DecodedTransaction) {
  for (const vin of tx.vin) {
    db.outputs.addRelayed(vin.txid, vin.vout);
  }
}

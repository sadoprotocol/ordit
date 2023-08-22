import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";

export const getBalance = method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    let balance = 0;

    const outputs = await db.outputs.find({ addresses: address, ...noSpentsFilter });
    for (const output of outputs) {
      if (!output.value) {
        const tx = await rpc.transactions.getRawTransaction(output.vout.txid, true);
        if (tx === undefined) {
          continue;
        }
        const vout = tx.vout[output.vout.n];
        if (vout === undefined) {
          continue;
        }
        balance += vout.value;
      } else {
        balance += output.value;
      }
    }

    return balance;
  },
});

import { BadRequestError, method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { UTXO } from "~Libraries/Runes/types";

import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { btcToSat } from "../../Utilities/Bitcoin";

export default method({
  params: Schema({
    address: string,
    spaced_rune: string,
    amount: string,
  }),
  handler: async ({ address, spaced_rune, amount }) => {
    if (isNaN(amount as any)) {
      throw new BadRequestError("Amount is not a valid number / bigint");
    }
    const amountBigint = BigInt(amount);

    const outputs = await db.outputs.find({ addresses: address, ...noSpentsFilter });
    if (!outputs) {
      return [];
    }

    const runeOutputsBalances = await ord.getRuneOutputsBalancesByOutpoints(
      outputs.map((output) => `${output.vout.txid}:${output.vout.n}`),
    );

    let totalAmount = 0n;
    const outpoints: {
      outpoint: string;
      amount: string;
    }[] = [];

    const entries = Object.entries(runeOutputsBalances);

    for (let i = 0; i < entries.length; i += 1) {
      if (totalAmount >= amountBigint) {
        break;
      }
      for (let j = 0; j < entries[i][1].length; j++) {
        const outputBalance = entries[i][1][j];
        if (outputBalance.spaced_rune === spaced_rune) {
          totalAmount += BigInt(outputBalance.amount);
          // 1 output only possible to has 1 kind of rune
          // TODO: check if it is possible 1 output has multiple rune?
          outpoints.push({
            outpoint: entries[i][0],
            amount: outputBalance.amount,
          });
          break;
        }
      }
    }

    if (totalAmount < amountBigint) {
      throw new BadRequestError("Insufficient funds");
    }

    const utxos: {
      utxo: UTXO;
      amount: string;
    }[] = [];

    for (let i = 0; i < outpoints.length; i += 1) {
      const [txid, nStr] = outpoints[i].outpoint.split(":");
      const n = parseInt(nStr, 10);
      const tx = await rpc.transactions.getRawTransaction(txid, true);

      const vout = tx.vout[n];

      utxos.push({
        utxo: {
          txid,
          n,
          sats: btcToSat(vout.value),
          scriptPubKey: vout.scriptPubKey,
        },
        amount: outpoints[i].amount,
      });
    }

    return {
      utxos,
      changeAmount: (totalAmount - amountBigint).toString(),
    };
  },
});

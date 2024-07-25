import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { inscriptions } from "~Database/Inscriptions";
import { noSpentsFilter } from "~Database/Output/Utilities";
import { runes } from "~Database/Runes";
import { UTXO } from "~Libraries/Runes/types";

import { db } from "../../Database";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    const outputs = await db.outputs.find({ addresses: address, ...noSpentsFilter });
    if (!outputs) {
      return [];
    }

    const allOutputs: UTXO[] = outputs.map(
      (runeOut): UTXO => ({
        txid: runeOut.vout.txid,
        n: runeOut.vout.n,
        sats: runeOut.value,
        scriptPubKey: runeOut.scriptPubKey,
      }),
    );

    const runesOutputs = await runes.addressBalances(address);

    let runesUTXOs: UTXO[] = [];
    if (runesOutputs) {
      runesUTXOs = runesOutputs.map(
        (runeOut): UTXO => ({
          txid: runeOut.txid,
          n: runeOut.vout,
          sats: runeOut.satValue,
          scriptPubKey: runeOut.scriptPubKey,
        }),
      );
    }

    const result = await Promise.all(
      allOutputs.map(async (output) => {
        const hasInscriptions = await inscriptions.hasInscriptions(output.txid, output.n);
        const isInRunesUTXOs = runesUTXOs.some((runeOut) => runeOut.txid === output.txid && runeOut.n === output.n);
        return !isInRunesUTXOs && !hasInscriptions;
      }),
    );

    const filteredResults = allOutputs.filter((_, index) => result[index]);
    return filteredResults;
  },
});

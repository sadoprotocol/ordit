import { db } from "~Database";
import { Utxo } from "~Database/Utxos";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";
import { btcToSat } from "~Utilities/Bitcoin";

export const utxoIndexer: IndexHandler = {
  name: "utxos",

  async run(indexer: Indexer, { log }) {
    let ts = perf();

    const utxos: Utxo[] = [];
    const spents: string[] = [];

    for (const vout of indexer.vouts) {
      const address = vout.addresses[0];
      if (address !== undefined) {
        utxos.push({
          txid: vout.txid,
          n: vout.n,
          sats: btcToSat(vout.value),
          scriptPubKey: vout.scriptPubKey,
          address,
          location: `${vout.txid}:${vout.n}`,
        });
      }
    }

    for (const vin of indexer.vins) {
      spents.push(`${vin.vout.txid}:${vin.vout.n}`);
    }
    ts = perf();
    await db.utxos.insertMany(utxos);
    log(`💾 Created ${indexer.vouts.length.toLocaleString()} utxos [${ts.now} seconds]`);
    await db.utxos.deleteSpents(spents);
    log(`💾 Removed ${spents.length.toLocaleString()} utxos [${ts.now} seconds]`);
  },

  async reorg() {
    // ...
  },
};

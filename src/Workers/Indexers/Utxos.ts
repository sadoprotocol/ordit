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

    log(
      `🚚 Delivering ${utxos.length.toLocaleString()} utxos and ${spents.length.toLocaleString()} spents [${
        ts.now
      } seconds]`,
    );

    ts = perf();

    await Promise.all([
      db.utxos.insertMany(utxos).then(() => {
        log(`💾 Created ${utxos.length.toLocaleString()} utxos [${ts.now} seconds]`);
      }),
      db.utxos.deleteSpents(spents).then(() => {
        log(`💾 Removed ${spents.length.toLocaleString()} utxos [${ts.now} seconds]`);
      }),
    ]);
  },

  async reorg() {
    // ...
  },
};

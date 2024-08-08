import { db } from "~Database";
import { OutputDocument, SpentOutput } from "~Database/Output";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";

export const outputIndexer: IndexHandler = {
  name: "outputs",

  async run(indexer: Indexer, { log }) {
    let ts = perf();
    log(`[Outputs indexer]`);

    const outputs: OutputDocument[] = [];
    const spents: SpentOutput[] = [];

    for (const vout of indexer.vouts) {
      outputs.push({
        addresses: vout.addresses,
        value: vout.value,
        vout: {
          block: {
            hash: vout.block.hash,
            height: vout.block.height,
          },
          txid: vout.txid,
          n: vout.n,
        },
      });
    }

    for (const vin of indexer.vins) {
      spents.push({
        vout: {
          txid: vin.vout.txid,
          n: vin.vout.n,
        },
        vin: {
          block: {
            hash: vin.block.hash,
            height: vin.block.height,
          },
          txid: vin.txid,
          n: vin.n,
        },
      });
    }

    log(
      `🚚 Delivering ${outputs.length.toLocaleString()} outputs and ${spents.length.toLocaleString()} spents [${
        ts.now
      } seconds]`,
    );

    ts = perf();

    await db.outputs.insertMany(outputs).then(() => {
      log(`💾 Created ${outputs.length.toLocaleString()} outputs [${ts.now} seconds]`);
    });
    await db.outputs.addSpents(spents).then(() => {
      log(`💾 Updated ${spents.length.toLocaleString()} outputs [${ts.now} seconds]`);
    });
  },

  async reorg(height: number) {
    await db.outputs.deleteMany({ "vout.block.height": { $gte: height } });
  },
};

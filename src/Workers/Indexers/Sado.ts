import { db } from "~Database";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";

export const sadoIndexer: IndexHandler = {
  name: "sado",

  async run(indexer: Indexer, { log }) {
    // ...
  },

  async reorg(height: number) {
    await Promise.all([
      db.sado.events.deleteMany({ height: { $gte: height } }),
      db.sado.orders.deleteMany({ "block.height": { $gte: height } }),
    ]);
  },
};

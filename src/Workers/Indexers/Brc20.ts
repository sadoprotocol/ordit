import { db } from "~Database";
import { Indexer, IndexHandler } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";

export const brc20Indexer: IndexHandler = {
  name: "brc-20",

  async run(indexer: Indexer, { log }) {
    // ...
  },

  async reorg(height: number) {
    // await db.inscriptions.deleteMany({ height: { $gte: height } });
  },
};

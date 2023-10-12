import { config } from "~Config";
import { indexer } from "~Database/Indexer";
import { log, perf } from "~Libraries/Log";
import { Block, isCoinbaseTx, rpc, ScriptPubKey } from "~Services/Bitcoin";
import { getAddressessFromVout } from "~Utilities/Address";

import { getReorgHeight } from "./Reorg";

export class Indexer {
  readonly #indexers: IndexHandler[];
  readonly #treshold: {
    height?: number;
    blocks: number;
    vins: number;
    vouts: number;
  };

  #vins: VinData[] = [];
  #vouts: VoutData[] = [];

  constructor(options: IndexerOptions) {
    this.#indexers = options.indexers;
    this.#treshold = {
      height: options.treshold?.height,
      blocks: options.treshold?.blocks ?? 5_000,
      vins: options.treshold?.vins ?? 250_000,
      vouts: options.treshold?.vouts ?? 250_000,
    };
  }

  /*
   |--------------------------------------------------------------------------------
   | Accessors
   |--------------------------------------------------------------------------------
   */

  get vins() {
    return this.#vins;
  }

  get vouts() {
    return this.#vouts;
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  async run(blockHeight: number) {
    let currentHeight = await this.#getCurrentHeight();
    if (currentHeight === blockHeight) {
      return; // indexer has latest outputs
    }

    log(`\n ---------- indexing to block ${blockHeight.toLocaleString()} ----------`);

    currentHeight = await this.#reorgCheck(currentHeight);
    await this.#indexBlocks(currentHeight, blockHeight);
  }

  /*
   |--------------------------------------------------------------------------------
   | Reorg
   |--------------------------------------------------------------------------------
   */

  async #reorgCheck(blockHeight: number) {
    log("\n\n 🏥 Performing reorg check\n");

    const reorgHeight = await getReorgHeight();
    if (reorgHeight !== -1) {
      if (blockHeight - reorgHeight > config.reorg.treshold) {
        log(`\n   🚨 reorg at block ${reorgHeight} is unexpectedly far behind, needs manual review`);
        throw new Error("reorg detected, manual intervention required");
      }
      log(`\n   🚑 reorg detected at block ${reorgHeight}, starting rollback`);
      await Promise.all(this.#indexers.map((indexer) => indexer.reorg(reorgHeight)));
      await indexer.setHeight(reorgHeight - 1);
      return reorgHeight;
    }

    log("\n   💯 Chain is healthy");

    return blockHeight;
  }

  /*
   |--------------------------------------------------------------------------------
   | Block Indexer
   |--------------------------------------------------------------------------------
   */

  async #indexBlocks(currentHeight: number, blockHeight: number) {
    log(`\n\n 📦 Indexing blockchain from block ${currentHeight.toLocaleString()}\n`);

    let height = currentHeight + 1;
    let blockHash = await rpc.blockchain.getBlockHash(height);

    while (blockHash !== undefined && height <= blockHeight) {
      if (height === this.#treshold.height) {
        break; // reached configured height treshold
      }

      const ts = perf();
      const block = await rpc.blockchain.getBlock(blockHash, 2);

      log(`\n   💽 Reading block ${block.height.toLocaleString()} [${ts.now} seconds]`);

      // ### Block
      // Process the block and extract all the vin and vout information required
      // by subsequent index handlers.

      await this.#handleBlock(block);

      // ### Commit
      // Once we reach configured tresholds we commit the current vins and vouts
      // to the registered index handlers.

      if (this.#hasReachedTreshold(height)) {
        await this.#commit(height);
      }

      blockHash = block.nextblockhash;
      height += 1;
    }

    await this.#commit(blockHeight);
  }

  async #handleBlock(block: Block<2>) {
    for (const tx of block.tx) {
      const txid = tx.txid;

      if (isCoinbaseTx(tx) === false) {
        let n = 0;
        for (const vin of tx.vin) {
          this.#vins.push({
            txid,
            n,
            witness: vin.txinwitness,
            block: {
              hash: block.hash,
              height: block.height,
            },
            vout: {
              txid: vin.txid,
              n: vin.vout,
            },
          });
          n += 1;
        }
      }

      let n = 0;
      for (const vout of tx.vout) {
        this.#vouts.push({
          txid,
          n,
          addresses: await getAddressessFromVout(vout),
          value: vout.value,
          scriptPubKey: vout.scriptPubKey,
          block: {
            hash: block.hash,
            height: block.height,
          },
        });
        n += 1;
      }
    }
  }

  async #commit(height: number) {
    log(
      `\n\n   📖 Indexing ${this.#vouts.length.toLocaleString()} vouts and ${this.#vins.length.toLocaleString()} vins`,
    );

    // ### Run
    // Run all the registered index handlers and update the indexer
    // height tracker.

    for (const indexer of this.#indexers) {
      log(`\n\n     🏭 Running ${indexer.name} indexer\n`);
      await indexer.run(this, {
        height,
        log(message: string) {
          log(`\n       ${message}`);
        },
      });
    }
    await indexer.setHeight(height);

    // ### Clear
    // Once all indexers has fully processed without error we clear the
    // current vins and vouts in preparation for the next batch.

    this.#vins = [];
    this.#vouts = [];

    log(`\n`);
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  #hasReachedTreshold(height: number) {
    if (height !== 0 && height % this.#treshold.blocks === 0) {
      return true;
    }
    if (this.#vins.length > this.#treshold.vins) {
      return true;
    }
    if (this.#vouts.length > this.#treshold.vouts) {
      return true;
    }
    return false;
  }

  async #getCurrentHeight() {
    const currentHeight = await indexer.getHeight();
    if (currentHeight === null) {
      return -1;
    }
    return currentHeight;
  }
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

type IndexerOptions = {
  indexers: IndexHandler[];
  treshold?: {
    height?: number;
    blocks?: number;
    vins?: number;
    vouts?: number;
  };
};

export type IndexHandler = {
  name: string;
  run(
    indexer: Indexer,
    props: {
      height: number;
      log: (message: string) => void;
    },
  ): Promise<void>;
  reorg(height: number): Promise<void>;
};

export type VinData = TxMeta & {
  witness: string[];
  block: BlockMeta;
  vout: TxMeta;
};

type VoutData = TxMeta & {
  addresses: string[];
  value: number;
  scriptPubKey: ScriptPubKey;
  block: BlockMeta;
};

type TxMeta = {
  txid: string;
  n: number;
};

type BlockMeta = {
  hash: string;
  height: number;
};

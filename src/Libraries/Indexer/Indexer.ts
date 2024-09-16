import { assert } from "console";

import { config } from "~Config";
import { indexer } from "~Database/Indexer";
import { limiter } from "~Libraries/Limiter";
import { log, perf } from "~Libraries/Log";
import { Block, rpc, ScriptPubKey } from "~Services/Bitcoin";
import { getAddressessFromVout } from "~Utilities/Address";

import { getReorgHeight } from "./Reorg";

export class Indexer {
  readonly #indexers: IndexHandler[];
  readonly #threshold: {
    height?: number;
    blocks: number;
  };

  #vins: VinData[] = [];
  #vouts: VoutData[] = [];
  #blocks: Block<2>[] = [];

  constructor(options: IndexerOptions) {
    this.#indexers = options.indexers;
    this.#threshold = {
      height: options.threshold?.height ?? config.index.maxheight ?? undefined,
      blocks: options.threshold?.blocks ?? config.index.blocksThreshold ?? 1_000,
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

  get blocks() {
    return this.#blocks;
  }

  /*
   |--------------------------------------------------------------------------------
   | Methods
   |--------------------------------------------------------------------------------
   */

  async run(blockHeight: number) {
    let currentHeight = await this.#getCurrentHeight();

    if (config.index.maxheight) {
      const maxheight = config.index.maxheight;
      if (currentHeight >= maxheight) {
        log(`Current height ${currentHeight} is already at or past maxheight ${maxheight}`);
        return;
      }
      // If we are not yet at maxheight, we should index up to maxheight or blockheight, whichever is lower.
      assert(blockHeight <= maxheight);
    }

    if (currentHeight === blockHeight) {
      return; // indexer has latest outputs
    }

    log(`---------- indexing to block ${blockHeight.toLocaleString()} ----------`);

    const reorgHeight = await this.#reorgCheck(currentHeight);
    if (reorgHeight !== undefined) {
      currentHeight = reorgHeight;
    }
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
      if (blockHeight - reorgHeight > config.reorg.threshold) {
        log(`\n   🚨 reorg at block ${reorgHeight} is unexpectedly far behind, needs manual review`);
        throw new Error("reorg detected, manual intervention required");
      }
      log(`\n   🚑 reorg detected at block ${reorgHeight}, starting rollback`);
      await Promise.all(this.#indexers.map((indexer) => indexer.reorg(reorgHeight)));
      return reorgHeight - 1;
    }
    log("\n   💯 Chain is healthy");
  }

  /*
   |--------------------------------------------------------------------------------
   | Block Indexer
   |--------------------------------------------------------------------------------
   */

  async #fetchAndHandleBlock(blockHash: string, retries = 5) {
    try {
      const block = await rpc.blockchain.getBlock(blockHash, 2);
      await this.#handleBlock(block);
    } catch (error) {
      if (retries > 0 && error.code === -32000) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await this.#fetchAndHandleBlock(blockHash, retries - 1);
      } else {
        throw error;
      }
    }
  }

  async #indexBlocks(currentHeight: number, blockHeight: number) {
    log(`📦 Indexing blockchain from block ${currentHeight.toLocaleString()}`);

    let height = currentHeight + 1;
    let blockHash: string | undefined = await rpc.blockchain.getBlockHash(height);

    let startHeight = currentHeight;

    const blockLimiter = limiter(config.index.blockConcurrencyLimit ?? 8);

    let ts = perf();
    while (blockHash !== undefined && height <= blockHeight) {
      if (this.#threshold.height && this.#threshold.height <= height) {
        break; // reached configured height threshold
      }
      const currentBlockHash = blockHash;

      blockLimiter.push(() => this.#fetchAndHandleBlock(currentBlockHash as string));

      // ### Commit
      // Once we reach configured thresholds we commit the current vins and vouts
      // to the registered index handlers.

      if (this.#hasReachedBlocksCommitThreshold(height)) {
        log(`\n💽 Read blocks [${startHeight.toLocaleString()} - ${height.toLocaleString()}][${ts.now} seconds]`);
        startHeight = height;
        await blockLimiter.run();
        await this.#commit(height);
        ts = perf();
      }

      try {
        blockHash = await rpc.blockchain.getBlockHash(height + 1);
      } catch {
        blockHash = undefined;
      }
      height += 1;
    }
    await blockLimiter.run();
    await this.#commit(height - 1);
  }

  async #handleBlock(block: Block<2>) {
    this.#blocks.push(block);

    for (const tx of block.tx) {
      const txid = tx.txid;

      for (const [n, vin] of tx.vin.entries()) {
        this.#vins.push({
          txid,
          n,
          witness: vin.txinwitness ?? [],
          block: {
            hash: block.hash,
            height: block.height,
            time: block.time,
          },
          vout: {
            txid: vin.txid,
            n: vin.vout,
          },
        });
      }

      const voutLimiter = limiter(config.index.voutConcurrencyLimit ?? 50);
      for (const vout of tx.vout) {
        voutLimiter.push(async () => {
          const addresses = await getAddressessFromVout(vout);
          this.#vouts.push({
            txid,
            n: vout.n,
            addresses,
            value: vout.value,
            scriptPubKey: vout.scriptPubKey,
            block: {
              hash: block.hash,
              height: block.height,
              time: block.time,
            },
          });
        });
      }

      await voutLimiter.run();
    }
  }

  async #commit(height: number) {
    // ### Run
    // Run all the registered index handlers and update the indexer
    // height tracker.

    for (const indexer of this.#indexers) {
      await indexer.run(this, {
        height,
        log(message: string) {
          log(`${message}`);
        },
      });
    }
    await indexer.setHeight(height);

    // ### Clear
    // Once all indexers has fully processed without error we clear the
    // current vins and vouts in preparation for the next batch.

    this.#vins = [];
    this.#vouts = [];
    this.#blocks = [];
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  #hasReachedBlocksCommitThreshold(height: number) {
    return height !== 0 && height % this.#threshold.blocks === 0;
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
  threshold?: {
    height?: number;
    blocks?: number;
  };
};

export type IndexHandler = {
  name: string;
  run: (
    indexer: Indexer,
    props: {
      height: number;
      log: (message: string) => void;
    },
  ) => Promise<void>;
  reorg: (height: number) => Promise<void>;
};

export type VinData = TxMeta & {
  witness: string[];
  block: BlockMeta;
  vout: TxMeta;
};

export type VoutData = TxMeta & {
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
  time: number;
};

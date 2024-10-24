import { assert } from "console";

import { config } from "~Config";
import { indexer } from "~Database/Indexer";
import { limiter } from "~Libraries/Limiter";
import { log, perf } from "~Libraries/Log";
import { RUNES_BLOCK } from "~Libraries/Runes/Constants";
import { Block, rpc, ScriptPubKey } from "~Services/Bitcoin";
import { getAddressessFromVout } from "~Utilities/Address";
import { sleep } from "~Utilities/Helpers";

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
    let currentHeight = await indexer.getHeight();
    const startHeight = config.index.startHeight;
    const runesOnly = config.index.runesOnly;
    if (currentHeight === 0) {
      // fresh index
      if (runesOnly) currentHeight = RUNES_BLOCK;
      if (startHeight) currentHeight = startHeight;
    } else {
      // started index
      if (runesOnly && currentHeight < RUNES_BLOCK) currentHeight = RUNES_BLOCK;
      if (startHeight && currentHeight < startHeight) currentHeight = startHeight;
    }

    let targetHeight = blockHeight;

    if (config.index.maxheight) {
      const maxheight = config.index.maxheight;
      if (currentHeight >= maxheight) {
        log(`Current height ${currentHeight} is already at or past maxheight ${maxheight}`);
        return;
      }
      // If we are not yet at maxheight, we should index up to maxheight or blockheight, whichever is lower.
      assert(targetHeight <= maxheight);
      targetHeight = maxheight;
    }

    if (currentHeight === targetHeight) {
      return; // indexer has latest outputs
    }

    log(`---------- indexing to block ${targetHeight.toLocaleString()} ----------`);

    const reorgHeight = await this.#reorgCheck();
    const indexStartHeight = reorgHeight === -1 ? currentHeight : reorgHeight;
    await this.#indexBlocks(indexStartHeight, targetHeight);
  }

  /*
   |--------------------------------------------------------------------------------
   | Reorg
   |--------------------------------------------------------------------------------
   */

  async #reorgCheck() {
    log("\n🏥 Performing reorg check");

    const reorgHeight = await getReorgHeight();

    // reorg not detected
    if (reorgHeight === -1) {
      log("\n💯 Chain is healthy");
      return -1;
    }

    // if reorg found!
    log(`🚑 reorg detected at block ${reorgHeight}`);
    // all indexers run reorg cleanup
    await Promise.all(this.#indexers.map((indexer) => indexer.reorg(reorgHeight)));
    // return height for continuing the indexing
    return reorgHeight;
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

    let height = currentHeight;
    let blockHash: string | undefined;
    try {
      blockHash = await rpc.blockchain.getBlockHash(height);
    } catch (_) {
      // If bitcoin node is doing a reorg it might need a second try to catch up
      console.log("Rpc call getBlockHash failed, retry in 5 seconds");
      await sleep(5);
      blockHash = await rpc.blockchain.getBlockHash(height);
    }

    let startHeight = height;

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

      if (this.#hasReachedBlocksCommitThreshold(height) || height === blockHeight) {
        log(`\n💽 Reading blocks [${startHeight.toLocaleString()} - ${height.toLocaleString()}]`);
        await blockLimiter.run();
        console.log(`⌚ ${ts.now} seconds`);
        await this.#commit(height);
        startHeight = height + 1;
        ts = perf();
      }

      try {
        blockHash = await rpc.blockchain.getBlockHash(height + 1);
        height += 1;
      } catch {
        blockHash = undefined;
      }
    }
    await blockLimiter.run();
    await this.#commit(height);
  }

  async #handleBlock(block: Block<2>) {
    this.#blocks.push(block);

    if (!config.index.runesOnly) {
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

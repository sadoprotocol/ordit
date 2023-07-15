import debug from "debug";

import { config } from "../../Config";
import { logger } from "../../Logger";
import { addVins } from "../../Models/Vin";
import { addVouts } from "../../Models/Vout";
import { rpc } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";

const log = debug("ordit-indexer:crawler");

const maxBlockHeight = config.crawler.maxBlockHeight;

export async function crawl(blockN: number, maxBlockN: number) {
  if (maxBlockHeight !== 0 && blockN > maxBlockHeight) {
    log("max block height %d reached, terminating...", maxBlockHeight);
    return process.exit(0);
  }

  if (blockN > maxBlockN) {
    return log("crawler caught up with latest block %d, resting...", blockN);
  }

  logger.start();

  const blockHash = await rpc.blockchain.getBlockHash(blockN);
  const block = await rpc.blockchain.getBlock(blockHash, 2);

  let vinCount = 0;
  let voutCount = 0;

  for (const tx of block.tx) {
    await addVins(block, tx, tx.vin);
    await addVouts(block, tx, tx.vout);
    vinCount += tx.vin.length;
    voutCount += tx.vout.length;
  }

  // ### Debug
  // Identify any block that takes longer than 1 second to crawl.

  logger.stop();

  if (logger.timers.process / 1000 > 2) {
    log("crawled block %o", {
      block: blockN,
      txs: block.tx.length,
      vins: vinCount,
      vouts: voutCount,
      rpc: [logger.calls.rpc, logger.rpc],
      database: [logger.calls.database, logger.database],
      process: logger.process,
      total: logger.total,
    });
  }

  printProgress("ordit-indexer", blockN, maxBlockN);
}

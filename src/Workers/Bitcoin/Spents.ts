import debug from "debug";

import { config } from "../../Config";
import { logger } from "../../Logger";
import { addSpents, SpentDocument } from "../../Models/Spent";
import { isCoinbase, optional, rpc, Vout } from "../../Services/Bitcoin";
import { printProgress } from "../../Utilities/Progress";

const log = debug("bitcoin-spents");

const maxBlockHeight = config.parser.maxBlockHeight;

export async function spents(blockN: number, maxBlockN: number) {
  if (maxBlockHeight !== 0 && blockN > maxBlockHeight) {
    log("max block height %d reached, terminating...", maxBlockHeight);
    return process.exit(0);
  }

  if (blockN > maxBlockN) {
    return log("indexer caught up with latest block %d, resting...", blockN);
  }

  logger.start();

  const blockHash = await rpc.blockchain.getBlockHash(blockN);
  const block = await rpc.blockchain.getBlock(blockHash, 2);

  // ### Documents

  const spents: SpentDocument[] = [];

  for (const tx of block.tx) {
    let n = 0;
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        continue;
      }
      spents.push({
        block: blockN,
        vout: `${vin.txid}:${vin.vout}`,
        vin: `${tx.txid}:${n}`,
      });
      n += 1;
    }
  }

  if (spents.length !== 0) {
    addSpents(spents);
  }

  // ### Debug

  logger.stop();

  if (logger.total > 1) {
    log("indexed block %o", {
      block: blockN,
      txs: block.tx.length,
      time: logger.total.toFixed(3),
      rpc: [logger.calls.rpc, logger.rpc],
      database: [logger.calls.database, logger.database],
    });
  }

  printProgress("bitcoin-spents", blockN, maxBlockN);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export async function getAddressFromVout(vout: Vout): Promise<string | undefined> {
  if (vout.scriptPubKey.address !== undefined) {
    return vout.scriptPubKey.address;
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses[0];
  }
  if (vout.scriptPubKey.desc === undefined) {
    return undefined;
  }
  const derived = await rpc.util
    .deriveAddresses(vout.scriptPubKey.desc)
    .catch(optional<string[]>(rpc.util.code.NO_CORRESPONDING_ADDRESS, []));
  return derived[0];
}

import debug from "debug";

import { config } from "../../../Config";
import { logger } from "../../../Logger";
import { isCoinbase, rpc } from "../../../Services/Bitcoin";
import { neo } from "../../../Services/Neo";
import { getAddressessFromVout } from "../../../Utilities/Address";

const log = debug("bitcoin-crawler");

const maxBlockHeight = config.parser.maxBlockHeight;

export async function crawl(blockN: number, maxBlockN: number) {
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

  let t = performance.now();
  await neo.executeQuery(
    "CREATE UNIQUE (block:BLOCK { hash: $hash, height: $height })",
    {
      hash: block.hash,
      height: blockN,
    },
    { database: config.neo.database }
  );
  logger.addDatabase("block", performance.now() - t);

  const txs = [];
  const vins = [];
  const vouts = [];

  let index = 0;
  for (const tx of block.tx) {
    txs.push({
      txid: tx.txid,
      hash: tx.hash,
      block: block.hash,
      index,
    });
    index += 1;

    let vinIndex = 0;
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        continue;
      }
      vins.push({
        blockHash: block.hash,
        txid: vin.txid,
        vout: vin.vout,
        scriptSig: vin.scriptSig,
        txinwitness: vin.txinwitness ?? [],
        sequence: vin.sequence,
        index: vinIndex,
      });
      vinIndex += 1;
    }

    for (const vout of tx.vout) {
      const address = getAddressessFromVout(vout);
      if (!address) {
        console.log(vout, address);
        continue;
      }
      vouts.push({
        blockHash: block.hash,
        txid: tx.txid,
        value: vout.value,
        n: vout.n,
        address,
      });
    }
  }

  // ### TXS

  t = performance.now();
  await neo.executeQuery(
    `
      WITH $txs AS txs
      UNWIND txs AS tx
      MERGE 
        (n:TX { txid: tx.txid, hash: tx.hash })->(block:BLOCK { hash: tx.block })
    `,
    { txs },
    { database: config.neo.database }
  );
  logger.addDatabase("tx", performance.now() - t);

  // ### VOUTS

  t = performance.now();
  await neo.executeQuery(
    `
      WITH $vouts AS vouts
      UNWIND vouts AS vout
      MERGE (tx:TX { txid: vout.txid })-[:OUT { n: vout.n }]->(output:OUTPUT { value: vout.value })->(address:ADDRESS { address: vout.address })
    `,
    { vouts },
    { database: config.neo.database }
  );
  logger.addDatabase("vout", performance.now() - t);

  // ### VINS

  t = performance.now();
  await neo.executeQuery(
    `
      WITH $vins AS vins
      UNWIND vins AS vin
      MERGE 
        (n:VIN { txinwitness: vin.txinwitness, sequence: vin.sequence })-[:IN { n: vin.index }]->(tx:TX { txid: vin.txid })
    `,
    { vins },
    { database: config.neo.database }
  );
  logger.addDatabase("vin", performance.now() - t);

  // ### Debug

  logger.stop();

  if (logger.total > 1) {
    log("crawled block %o", {
      block: blockN,
      txs: block.tx.length,
      vins: vins.length,
      vouts: vouts.length,
      time: logger.total.toFixed(3),
      rpc: [logger.calls.rpc, logger.rpc],
      database: [logger.calls.database, logger.database],
    });
  }
}

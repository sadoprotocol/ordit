import { networks, payments } from "bitcoinjs-lib";
import debug from "debug";

import { config } from "../../Config";
import { logger } from "../../Logger";
import { addOutputs, OutputDocument, setSpentOutputs, SpentOutput } from "../../Models/Output";
import { isCoinbase, rpc, Vout } from "../../Services/Bitcoin";

const log = debug("bitcoin-crawler");

const maxBlockHeight = config.parser.maxBlockHeight;

const network = config.chain.network === "mainnet" ? networks.bitcoin : networks[config.chain.network];
if (network === undefined) {
  throw new Error("invalid network", network);
}

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

  const outputs: OutputDocument[] = [];
  const spents: SpentOutput[] = [];

  let addressTime = 0;

  for (const tx of block.tx) {
    let n = 0;
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        break;
      }
      spents.push({
        vout: {
          txid: vin.txid,
          n: vin.vout,
        },
        vin: {
          block: {
            hash: block.hash,
            height: block.height,
          },
          txid: tx.txid,
          n,
        },
      });
      n += 1;
    }
    for (const vout of tx.vout) {
      const t = performance.now();
      const addresses = await getAddressessFromVout(vout);
      addressTime += performance.now() - t;
      if (addresses.length === 0) {
        continue;
      }
      outputs.push({
        addresses,
        vout: {
          block: {
            hash: block.hash,
            height: block.height,
          },
          txid: tx.txid,
          n: vout.n,
        },
      });
    }
  }

  // ### Insert

  await addOutputs(outputs);
  await setSpentOutputs(spents);

  // ### Debug

  logger.stop();

  if (logger.total > 1) {
    log("crawled block %o", {
      block: blockN,
      txs: block.tx.length,
      vins: spents.length,
      vouts: outputs.length,
      total: logger.total.toFixed(3),
      address: (addressTime / 1000).toFixed(3),
      rpc: [logger.calls.rpc, logger.rpc],
      database: [logger.calls.database, logger.database],
    });
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getAddressessFromVout(vout: Vout) {
  if (vout.scriptPubKey.address !== undefined) {
    return [vout.scriptPubKey.address];
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses;
  }
  const address = extractAddress(vout.scriptPubKey.hex);
  if (address === undefined) {
    return [];
  }
  return [address];
}

function extractAddress(scriptPubKeyHex: string) {
  const scriptPubKey = Buffer.from(scriptPubKeyHex, "hex");

  try {
    const address = payments.p2pkh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2sh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2wpkh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2wsh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  return undefined;
}

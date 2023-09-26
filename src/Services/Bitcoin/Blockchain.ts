import { rpc } from "./Rpc";
import { RawTransaction } from "./Transactions";

const BLOCK_NOT_FOUND = -5;
const BLOCK_HASH_NOT_FOUND = -8;

export const blockchain = {
  code: {
    BLOCK_NOT_FOUND,
    BLOCK_HASH_NOT_FOUND,
  },
  getLatestBlock,
  getBlock,
  getBlockchainInfo,
  getBlockCount,
  getBlockHash,
  getBlockStats,
  getMemPoolInfo,
  getRawMemPool,
  getTxOut,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

async function getLatestBlock(verosity: 0): Promise<string>;
async function getLatestBlock(verosity?: 1): Promise<Block>;
async function getLatestBlock(verbosity: 2): Promise<Block<2>>;
async function getLatestBlock(verbosity = 1): Promise<Block | Block<2> | string> {
  return getBlock(await getBlockCount(), verbosity as any);
}

/**
 * Return block data.
 *
 *  - If verbosity is 0, returns a string that is serialized, hex-encoded data for
 *    block ‘hash’.
 *  - If verbosity is 1, returns an Object with information about block ‘hash’.
 *  - If verbosity is 2, returns an Object with information about block ‘hash’ and
 *    information about each transaction.
 *
 * @param hashOrHeight - Block to retrieve by its hash or height.
 * @param verbosity    - Verbosity level of the returned data.
 */
async function getBlock(hashOrHeight: string | number, verbosity: 0): Promise<string>;
async function getBlock(hashOrHeight: string | number, verbosity?: 1): Promise<Block>;
async function getBlock(hashOrHeight: string | number, verbosity: 2): Promise<Block<2>>;
async function getBlock(hashOrHeight: string | number, verbosity = 1): Promise<Block | Block<2> | string> {
  let hash = hashOrHeight;
  if (typeof hashOrHeight === "number") {
    hash = await getBlockHash(hashOrHeight);
  }
  return rpc("getblock", [hash, verbosity]);
}

/**
 * Returns an object containing various state info regarding blockchain processing.
 */
async function getBlockchainInfo(): Promise<BlockchainInfo> {
  return rpc("getblockchaininfo");
}

/**
 * Returns the height of the most-work fully-validated chain.
 *
 * The genesis block has height 0.
 */
async function getBlockCount(): Promise<number> {
  return rpc("getblockcount");
}

/**
 * Returns hash of block in best-block-chain at height provided.
 *
 * @param height - Height of the block whose hash should be returned.
 */
async function getBlockHash(height: number): Promise<string> {
  return rpc("getblockhash", [height]);
}

/**
 * Compute per block statistics for a given window. All amounts are in satoshis.
 *
 * @param height - Height of the block whose hash should be returned.
 * @param pluck  - Values to pluck from the stats. Default. all
 */
async function getBlockStats(hashOrHeight: string | number, pluck?: string[]): Promise<BlockStats> {
  const args: [string | number, string[]?] = [hashOrHeight];
  if (pluck !== undefined) {
    args.push(pluck);
  }
  const stats = await rpc("getblockstats", args);
  if (stats === undefined) {
    throw new Error("Block not found");
  }
  return toBlockStats(stats);
}

/**
 * Returns details on the active state of the TX memory pool.
 */
async function getMemPoolInfo(): Promise<MemPoolInfo> {
  return rpc("getmempoolinfo");
}

/**
 * Returns all transaction ids in memory pool as a json array of string transaction ids.
 *
 * Hint: use getMemPoolEntry to fetch a specific transaction from the mempool.
 */
async function getRawMemPool(): Promise<string[]>;
async function getRawMemPool(verbose: true): Promise<{ [txid: string]: RawMempoolTransation }>;
async function getRawMemPool(verbose = false): Promise<string[] | { [txid: string]: RawMempoolTransation }> {
  return rpc("getrawmempool", [verbose]);
}

/**
 * Returns details about an unspent transaction output.
 *
 * @param txid
 * @param n
 * @param includeMemPool
 */
async function getTxOut(txid: string, vout: number, include_mempool = true): Promise<TxOut | null> {
  return rpc("gettxout", [txid, vout, include_mempool]);
}

/*
 |--------------------------------------------------------------------------------
 | Formatters
 |--------------------------------------------------------------------------------
 */

function toBlockStats(stats: any): BlockStats {
  return {
    avgFee: stats.avgfee,
    avgFeeRate: stats.avgfeerate,
    avgTxSize: stats.avgtxsize,
    blockhash: stats.blockhash,
    feeratePercentiles: stats.feerate_percentiles,
    height: stats.height,
    ins: stats.ins,
    maxFee: stats.maxfee,
    maxFeeRate: stats.maxfeerate,
    maxTxSize: stats.maxtxsize,
    medianFee: stats.medianfee,
    medianTime: stats.mediantime,
    medianTxSize: stats.mediantxsize,
    minFee: stats.minfee,
    minFeeRate: stats.minfeerate,
    minTxSize: stats.mintxsize,
    outs: stats.outs,
    subsidy: stats.subsidy,
    swTotalSize: stats.swtotal_size,
    swTotalWeight: stats.swtotal_weight,
    swtxs: stats.swtxs,
    time: stats.time,
    totalOut: stats.total_out,
    totalSize: stats.total_size,
    totalWeight: stats.total_weight,
    totalfee: stats.totalfee,
    txs: stats.tx,
    utxoIncrease: stats.utxo_increase,
    utxoSizeIncrease: stats.utxo_size_increase,
  };
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type BlockchainInfo = {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  time: number;
  mediantime: number;
  verificationprogress: number;
  initialblockdownload: boolean;
  chainwork: string;
  size_on_disk: number;
  pruned: boolean;
  warnings: string;
};

export type BlockStats = {
  avgFee: number;
  avgFeeRate: number;
  avgTxSize: number;
  blockhash: string;
  feeratePercentiles: number[];
  height: number;
  ins: number;
  maxFee: number;
  maxFeeRate: number;
  maxTxSize: number;
  medianFee: number;
  medianTime: number;
  medianTxSize: number;
  minFee: number;
  minFeeRate: number;
  minTxSize: number;
  outs: number;
  subsidy: number;
  swTotalSize: number;
  swTotalWeight: number;
  swtxs: number;
  time: number;
  totalOut: number;
  totalSize: number;
  totalWeight: number;
  totalfee: number;
  txs: number;
  utxoIncrease: number;
  utxoSizeIncrease: number;
};

export type MemPoolInfo = {
  loaded: boolean;
  size: number;
  bytes: number;
  usage: number;
  maxmempool: number;
  mempoolminfee: number;
  minrelaytxfee: number;
  unbroadcastcount: number;
};

export type RawMempoolTransation = {
  vsize: number;
  weight: number;
  fee: number;
  modifiedfee: number;
  time: number;
  height: number;
  descendantcount: number;
  descendantsize: number;
  descendantfees: number;
  ancestorcount: number;
  ancestorsize: number;
  ancestorfees: number;
  wtxid: string;
  fees: {
    base: number;
    modified: number;
    ancestor: number;
    descendant: number;
  };
  depends: string[];
  spentby: string[];
  bip125_replaceable: boolean;
  unbroadcast: boolean;
};

export type Block<Verbosity = 1> = {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  strippedsize: number;
  size: number;
  weight: number;
  tx: Verbosity extends 1 ? string[] : RawTransaction[];
};

type TxOut = {
  bestblock: string;
  confirmations: number;
  value: number;
  scriptPubKey: ScriptPubKey;
  coinbase: boolean;
};

export type ScriptPubKey = {
  asm: string;
  hex: string;
  reqSigs: number;
  type: string;
  addresses: string[];
};

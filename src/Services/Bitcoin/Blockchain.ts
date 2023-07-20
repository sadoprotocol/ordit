import { rpc } from "./Rpc";
import { RawTransaction } from "./Transactions";

const BLOCK_NOT_FOUND = -5;
const BLOCK_HASH_NOT_FOUND = -8;

export const blockchain = {
  code: {
    BLOCK_NOT_FOUND,
    BLOCK_HASH_NOT_FOUND,
  },
  getBlock,
  getBlockchainInfo,
  getBlockCount,
  getBlockHash,
  getMemPoolInfo,
  getRawMemPool,
  getTxOut,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Return block data.
 *
 *  - If verbosity is 0, returns a string that is serialized, hex-encoded data for
 *    block ‘hash’.
 *  - If verbosity is 1, returns an Object with information about block ‘hash’.
 *  - If verbosity is 2, returns an Object with information about block ‘hash’ and
 *    information about each transaction.
 *
 * @param hash      - Block hash to retrieve.
 * @param verbosity - Verbosity level of the returned data.
 */
async function getBlock(hash: string, verbosity: 0): Promise<string>;
async function getBlock(hash: string, verbosity?: 1): Promise<Block>;
async function getBlock(hash: string, verbosity: 2): Promise<Block & Transactions>;
async function getBlock(hash: string, verbosity = 1): Promise<Block | (Block & Transactions) | string> {
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

export type Block = {
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
  tx: string[];
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

type Transactions = {
  tx: RawTransaction[];
};

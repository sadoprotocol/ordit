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
  getBlockHash,
  getBlockCount,
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
  return rpc<Block>("getblock", [hash, verbosity]);
}

/**
 * Returns hash of block in best-block-chain at height provided.
 *
 * @param height - Height of the block whose hash should be returned.
 */
async function getBlockHash(height: number): Promise<string> {
  return rpc<string>("getblockhash", [height]);
}

/**
 * Returns the height of the most-work fully-validated chain.
 *
 * The genesis block has height 0.
 */
async function getBlockCount(): Promise<number> {
  return rpc<number>("getblockcount");
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

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

type Transactions = {
  tx: RawTransaction[];
};

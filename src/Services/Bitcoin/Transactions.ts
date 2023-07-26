import { rpc } from "./Rpc";

const TRANSACTION_NOT_FOUND = -5;

export const transactions = {
  code: {
    TRANSACTION_NOT_FOUND,
  },
  getRawTransaction,
  decodeScript,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Return the raw transaction data.
 *
 * By default this function only works for mempool transactions. When called with
 * a blockhash argument, getrawtransaction will return the transaction if the
 * specified block is available and the transaction is found in that block. When
 * called without a blockhash argument, getrawtransaction will return the
 * transaction if it is in the mempool, or if -txindex is enabled and the
 * transaction is in a block in the blockchain.
 *
 *  - If verbose is ‘true’, returns an Object with information about ‘txid’.
 *  - If verbose is ‘false’ or omitted, returns a string that is serialized,
 *    hex-encoded data for ‘txid’.
 *
 * Hint: Use gettransaction for wallet transactions.
 *
 * @param txid    - Transaction id to retrieve.
 * @param verbose - Verbosity level of the returned data.
 */
async function getRawTransaction(txid: string, verbose?: false): Promise<string>;
async function getRawTransaction(txid: string, verbose: true): Promise<RawTransaction>;
async function getRawTransaction(txid: string, verbose = false): Promise<RawTransaction | string> {
  return rpc<RawTransaction>("getrawtransaction", [txid, verbose]);
}

/**
 * Decode a hex-encoded script.
 *
 * @param hex - Hex-encoded script.
 */
async function decodeScript(hex: string): Promise<Script | undefined> {
  return rpc<Script | undefined>("decodescript", [hex]);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

export function isCoinbase(vin: Vin): vin is Coinbase {
  return "coinbase" in vin;
}

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type RawTransaction = {
  hex: string;
  txid: string;
  hash: string;
  size: number;
  vsize: number;
  version: number;
  locktime: number;
  vin: Vin[];
  vout: Vout[];
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
  weight: number;
};

export type Script = {
  asm: string;
  type: string;
  reqSigs: number;
  addresses: string[];
  p2sh?: string;
  segwit?: SegWit;
};

export type SegWit = {
  asm: string;
  hex: string;
  type: string;
  reqSigs: number;
  addresses: string[];
  p2shSegwit: string;
};

export type Vin = Coinbase | TxVin;

export type Coinbase = {
  coinbase: string;
  sequence: number;
};

export type TxVin = {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  txinwitness: string[];
  sequence: number;
};

export type Vout = {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    desc: string;
    hex: string;
    reqSigs?: number;
    type: string;
    addresses: string[];
    address?: string;
  };
};

import { ScriptPubKey } from "~Services/Bitcoin";

export type UTXO = {
  txid: string;
  n: number;
  sats: number;
  scriptPubKey: ScriptPubKey | Buffer;
};

export type Outpoint = {
  outpoint: string;
  amount: string;
  utxo?: UTXO;
};

export type RuneBalance = {
  spaced_rune: string;
  amount: string;
  divisibility: number;
  symbol?: string;
  outpoints?: Outpoint[];
};

import { address, Psbt, Transaction } from "bitcoinjs-lib";

import { getBitcoinNetwork } from "../Libraries/Network";
import { Network } from "../Libraries/Network";
import { rpc } from "../Services/Bitcoin";
import { ScriptPubKey } from "../Services/Bitcoin";
import { bip32 } from "./Bip32";
import { btcToSat } from "./Bitcoin";
import { createTransaction } from "./Transaction";

/**
 * Attempt to retrieve a PSBT from the psbt string. We try both hex and base64
 * formats as we don't know which one the user will provide.
 *
 * @param psbt - Encoded psbt.
 *
 * @returns The PSBT or undefined if it could not be parsed.
 */
export function decodePsbt(psbt: string): Psbt | undefined {
  const network = getBitcoinNetwork();
  try {
    return Psbt.fromHex(psbt, { network });
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the hex.
    // not a PSBT hex offer
  }
  try {
    return Psbt.fromBase64(psbt, { network });
  } catch (err) {
    // TODO: Add better check in case the error is not about failure to
    //       parse the base64.
    // not a PSBT base64 offer
  }
}

/**
 * Make sure to add a higher fee rate if the blockchain is congested.
 *
 * @param psbt        - Psbt to estimate fee for.
 * @param satsPerByte - Fee rate in satoshis per byte.
 *
 * @returns Estimated fee in satoshis.
 */
export function getEstimatedPsbtFee(psbt: Psbt, satsPerByte: number): number {
  let base = 0;
  let virtual = 0;

  for (const input of psbt.data.inputs) {
    if (input.witnessUtxo !== undefined) {
      base += 180;
    } else {
      base += 41;
      virtual += 108;
    }
  }

  base += 34 * psbt.txOutputs.length + 34; // outputs are the same size no matter segwit or not, include the change output
  base += 10; // 10 extra bytes for version, locktime, etc.
  virtual += Math.ceil((base + virtual) / 4); // virtual size is base for non-segwit data plus 1/4 of segwit data

  return virtual * satsPerByte;
}

/**
 * Calculate the fee for given PSBT by looking up the input transactions and
 * subtracting the output values.
 *
 * @param psbt   - The PSBT to calculate the fee for.
 * @param lookup - The lookup service to use to retrieve the input transactions.
 *
 * @returns The fee in satoshis.
 */
export async function getPsbtFee(psbt: Psbt): Promise<number> {
  let inputSum = 0;
  for (const input of psbt.txInputs) {
    const hash = input.hash.reverse().toString("hex");
    const tx = await rpc.transactions.getRawTransaction(hash, true);
    if (tx !== undefined) {
      inputSum += btcToSat(tx.vout[input.index].value);
    }
  }

  let outputSum = 0;
  for (const output of psbt.txOutputs) {
    outputSum += output.value;
  }

  return inputSum - outputSum;
}

/**
 * Convert a PSBT to a JSON object.
 *
 * @param psbt - PSBT to convert.
 *
 * @returns PSBT as a JSON object.
 */
export function getPsbtAsJSON(psbt: Psbt) {
  const network = getBitcoinNetwork();
  return {
    inputs: psbt.data.inputs.map((input, index) => {
      const txid = psbt.txInputs[index].hash.reverse().toString("hex");
      const vout = psbt.txInputs[index].index;

      const location = `${txid}:${vout}`;
      const signed = input.finalScriptWitness !== undefined || input.finalScriptSig !== undefined;

      if (input.witnessUtxo) {
        return {
          txid,
          vout,
          location,
          address: address.fromOutputScript(input.witnessUtxo.script, network),
          value: input.witnessUtxo.value,
          signed,
        };
      } else if (input.nonWitnessUtxo) {
        const txin = psbt.txInputs[index];
        const txout = Transaction.fromBuffer(input.nonWitnessUtxo).outs[txin.index];
        return {
          txid,
          vout,
          location,
          address: address.fromOutputScript(txout.script, network),
          value: txout.value,
          signed,
        };
      } else {
        throw new Error("Could not get input of #" + index);
      }
    }),
    outputs: psbt.txOutputs.map((o) => ({
      address: o.address,
      value: o.value,
    })),
  };
}

/**
 * Parses data to be either taproot, segwit, nested segwit or legacy
 *
 * @param utxo - UTXO data
 * @param pubKey - Public key
 * @param sighashType - signature hash type
 *
 * @returns TODO
 */
export async function processInput({ utxo, pubKey, network, sighashType }: ProcessInputOptions): Promise<InputType> {
  switch (utxo.scriptPubKey.type) {
    case "witness_v1_taproot":
      return generateTaprootInput({ utxo, pubKey, network, sighashType });

    case "witness_v0_scripthash":
    case "witness_v0_keyhash":
      return generateSegwitInput({ utxo, sighashType });

    case "scripthash":
      return generateNestedSegwitInput({ utxo, pubKey, network, sighashType });

    case "pubkeyhash":
      return generateLegacyInput({ utxo, sighashType, network });

    default:
      throw new Error("invalid script pub type");
  }
}

/**
 * Generates a taproot input.
 *
 * @param utxo - UTXO data
 * @param pubKey - Public key
 * @param sighashType - signature hash type
 *
 * @returns TODO
 *
 */
export function generateTaprootInput({ utxo, pubKey, sighashType }: ProcessInputOptions): TaprootInputType {
  const chainCode = Buffer.alloc(32);
  chainCode.fill(1);

  const key = bip32.fromPublicKey(Buffer.from(pubKey, "hex"), chainCode, getBitcoinNetwork());
  const xOnlyPubKey = toXOnly(key.publicKey);

  if (!utxo.scriptPubKey.hex) {
    throw new Error("Unable to process p2tr input");
  }

  return {
    hash: utxo.txid,
    index: utxo.n,
    tapInternalKey: xOnlyPubKey,
    witnessUtxo: {
      script: Buffer.from(utxo.scriptPubKey.hex, "hex"),
      value: utxo.sats,
    },
    ...(sighashType ? { sighashType } : undefined),
  };
}

/**
 * Generates a segwit input.
 *
 * @param utxo - UTXO data
 * @param sighashType - signature hash type
 *
 * @returns TODO
 *
 */
export function generateSegwitInput({
  utxo,
  sighashType,
}: Omit<ProcessInputOptions, "pubKey" | "network">): BaseInputType {
  if (!utxo.scriptPubKey.hex) {
    throw new Error("Unable to process Segwit input");
  }

  return {
    hash: utxo.txid,
    index: utxo.n,
    witnessUtxo: {
      script: Buffer.from(utxo.scriptPubKey.hex, "hex"),
      value: utxo.sats,
    },
    ...(sighashType ? { sighashType } : undefined),
  };
}

/**
 * Generates a nested segwit input.
 *
 * @param utxo - UTXO data
 * @param pubKey - Public key
 * @param sighashType - signature hash type
 *
 * @returns TODO
 *
 */
export function generateNestedSegwitInput({
  utxo,
  pubKey,
  network,
  sighashType,
}: ProcessInputOptions): NestedSegwitInputType {
  const p2sh = createTransaction(Buffer.from(pubKey, "hex"), "p2sh", network);
  if (!p2sh || !p2sh.output || !p2sh.redeem) {
    throw new Error("Unable to process Segwit input");
  }

  return {
    hash: utxo.txid,
    index: utxo.n,
    redeemScript: p2sh.redeem.output!,
    witnessUtxo: {
      script: Buffer.from(utxo.scriptPubKey.hex, "hex"),
      value: utxo.sats,
    },
    ...(sighashType ? { sighashType } : undefined),
  };
}

/**
 * Generates a legacy input.
 *
 * @param utxo - UTXO data
 * @param sighashType - signature hash type
 *
 * @returns TODO
 *
 */
export async function generateLegacyInput({
  utxo,
  sighashType,
}: Omit<ProcessInputOptions, "pubKey">): Promise<BaseInputType> {
  //   const { rawTx } = await OrditApi.fetchTx({ txId: utxo.txid, network, hex: true });
  const tx = await rpc.transactions.getRawTransaction(utxo.txid, true);
  const rawTx = tx.hex ? Transaction.fromHex(tx.hex) : undefined;

  if (!rawTx) {
    throw new Error("Unable to process legacy input");
  }

  return {
    hash: utxo.txid,
    index: utxo.n,
    nonWitnessUtxo: rawTx?.toBuffer(),
    ...(sighashType ? { sighashType } : undefined),
  };
}

export function toXOnly(pubkey: Buffer): Buffer {
  return pubkey.subarray(1, 33);
}

export type PsbtJSON = ReturnType<typeof getPsbtAsJSON>;

export type PsbtInput = Psbt["data"]["inputs"][number] & {
  hash: string | Buffer;
  index: number;
  sequence?: number;
};

type ProcessInputOptions = {
  utxo: UTXO;
  pubKey: string;
  network: Network;
  sighashType?: number;
};

export type UTXO = {
  n: number;
  txHash: string;
  blockHash: string;
  blockN: number;
  sats: number;
  scriptPubKey: ScriptPubKey;
  txid: string;
  value: number;
  ordinals?: Ordinal[] | null;
  inscriptions?: Inscription[] | null;
  safeToSpend: boolean;
  confirmation: number;
};

type Ordinal = {
  number: number;
  decimal: string;
  degree: string;
  name: string;
  height: number;
  cycle: number;
  epoch: number;
  period: number;
  offset: number;
  rarity: Rarity;
  output: string;
  start: number;
  size: number;
};

export type Inscription = {
  id: string;
  outpoint: string;
  owner: string;
  genesis: string;
  fee: number;
  height: number;
  number: number;
  sat: number;
  timestamp: number;
  mediaType: string;
  mediaSize: number;
  mediaContent: string;
  meta?: Record<string, any>;
};

export enum RarityEnum {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
  MYTHIC = "mythic",
}

export type Rarity = `${RarityEnum}`;

export type InputType = BaseInputType | TaprootInputType | NestedSegwitInputType;

type TaprootInputType = BaseInputType & {
  tapInternalKey: Buffer;
};

type NestedSegwitInputType = BaseInputType & {
  redeemScript: Buffer;
};

// TODO: replace below interfaces and custom types w/ PsbtInputExtended from bitcoinjs-lib
interface BaseInputType {
  hash: string;
  index: number;
  sighashType?: number;
  witnessUtxo?: {
    script: Buffer;
    value: number;
  };
  nonWitnessUtxo?: Buffer;
}

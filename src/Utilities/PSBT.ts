import { address, Psbt, Transaction } from "bitcoinjs-lib";

import { getBitcoinNetwork } from "../Libraries/Network";
import { rpc } from "../Services/Bitcoin";
import { btcToSat } from "./Bitcoin";

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

export type PsbtJSON = ReturnType<typeof getPsbtAsJSON>;

export type PsbtInput = Psbt["data"]["inputs"][number] & {
  hash: string | Buffer;
  index: number;
  sequence?: number;
};

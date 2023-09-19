import { method } from "@valkyr/api";
import * as bitcoin from "bitcoinjs-lib";
import Schema, { array, boolean, number, string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { schema } from "../../Libraries/Schema";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { getSafeToSpendState } from "../../Services/Ord";
import { addressTypeToName } from "../../Utilities/Address";
import { btcToSat } from "../../Utilities/Bitcoin";
import { getAddressType2 } from "../../Utilities/Bitcoin";
import { processInput } from "../../Utilities/PSBT";
import { calculateTxFee } from "../../Utilities/Transaction";

// amount lower than this is considered as dust value
// and majority of the miners don't pick txs w/ the following output value or lower
export const MINIMUM_AMOUNT_IN_SATS = 600;

const CreatePsbtOptions = Schema({
  satsPerByte: number,
  address: string,
  outputs: array.of(schema.outputs),
  enableRBF: boolean.optional(),
  pubKey: string,
  safeMode: schema.onOrOff.optional(),
});

export default method({
  params: CreatePsbtOptions,
  handler: async ({ satsPerByte, address, outputs, enableRBF, pubKey, safeMode }) => {
    if (!outputs.length) {
      throw new Error("Invalid request");
    }
    // const { spendableUTXOs, unspendableUTXOs, totalUTXOs } = await OrditApi.fetchUnspentUTXOs({
    //   address,
    //   network,
    //   type: safeMode === "off" ? "all" : "spendable",
    // });

    // if (!totalUTXOs) {
    //   throw new Error("No spendable UTXOs");
    // }

    const outputs_ = await db.outputs.find({
      addresses: [address],
      ...noSpentsFilter,
    });

    if (outputs_.length <= 0) {
      throw new Error("No outputs");
    }

    const utxo_: any[] = [];
    for (const { vout } of outputs_) {
      // required to be done in a loop to be sync
      const outpoint = `${vout.txid}:${vout.n}`;

      const tx = await rpc.transactions.getRawTransaction(vout.txid, true); // doesn't work in map
      const txVout = tx.vout[vout.n];

      let tmp_utxo: any;
      // eslint-disable-next-line
      tmp_utxo = {
        n: vout.n,
        blockHash: vout.block.hash,
        blockN: vout.block.height,
        sats: btcToSat(txVout.value),
        scriptPubKey: txVout.scriptPubKey,
        txid: vout.txid,
        value: txVout.value,
        ordinals: await ord.getOrdinals(outpoint),
        inscriptions: await db.inscriptions.getInscriptionsByOutpoint(outpoint),
      };
      // eslint-disable-next-line
      // @ts-ignore
      tmp_utxo.safeToSpend = getSafeToSpendState(tmp_utxo.ordinals, tmp_utxo.inscriptions, ["common"]);

      utxo_.push(tmp_utxo);
    }

    const { spendableUTXOs, unspendableUTXOs } = utxo_.reduce(
      (acc, utxo) => {
        if (utxo.inscriptions?.length <= 0 || utxo.safeToSpend) {
          acc.spendableUTXOs.push(utxo);
        } else {
          // utxo.inscriptions = transformInscriptions(utxo.inscriptions)
          // TODO: no transformation ^ makes if effectively the same
          acc.unspendableUTXOs.push(utxo);
        }

        return acc;
      },
      {
        spendableUTXOs: [],
        unspendableUTXOs: [],
      } as Record<string, any[]>
    );

    const nativeNetwork = getBitcoinNetwork();
    const psbt = new bitcoin.Psbt({ network: nativeNetwork });
    const inputSats = spendableUTXOs
      .concat(safeMode === "off" ? unspendableUTXOs : [])
      .reduce((acc: any, utxo: any) => (acc += utxo.sats), 0);
    const outputSats = outputs.reduce((acc, utxo) => (acc += utxo.cardinals), 0);

    // add inputs
    const witnessScripts: Buffer[] = [];
    for (const [index, utxo] of spendableUTXOs.entries()) {
      if (utxo.scriptPubKey.address !== address) continue;

      const payload = await processInput({ utxo, pubKey, network: config.network });
      payload.witnessUtxo?.script && witnessScripts.push(payload.witnessUtxo?.script);
      psbt.addInput(payload);

      if (enableRBF) {
        psbt.setInputSequence(index, 0xfffffffd);
      }
    }

    const fees = calculateTxFee({
      totalInputs: outputs_.length, //totalUTXOs, // select only relevant utxos to spend. NOT ALL!
      totalOutputs: outputs.length,
      satsPerByte,
      type: addressTypeToName[getAddressType2(address)],
      additional: { witnessScripts },
    });

    const remainingBalance = inputSats - outputSats - fees;
    if (remainingBalance < 0) {
      throw new Error(
        `Insufficient balance. Available: ${inputSats}. Attemping to spend: ${outputSats}. Fees: ${fees}`
      );
    }

    const isChangeOwed = remainingBalance > MINIMUM_AMOUNT_IN_SATS;
    if (isChangeOwed) {
      outputs.push({
        address,
        cardinals: remainingBalance,
      });
    }

    // add outputs
    outputs.forEach((out) => {
      psbt.addOutput({
        address: out.address,
        value: out.cardinals,
      });
    });

    return {
      hex: psbt.toHex(),
      base64: psbt.toBase64(),
    };
  },
});

// type CreatePsbtOptionsType = Type<typeof CreatePsbtOptions>;

import { method } from "@valkyr/api";
import * as bitcoin from "bitcoinjs-lib";
import Schema, { boolean, number, string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { schema } from "../../Libraries/Schema";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { getSafeToSpendState } from "../../Services/Ord";
import { addressNameToType, getAddressesFromPublicKey } from "../../Utilities/Address";
import { btcToSat } from "../../Utilities/Bitcoin";
import { processInput } from "../../Utilities/PSBT";
import { calculateTxFee } from "../../Utilities/Transaction";
import { InputsToSign } from "./GenerateSellerPsbt";

// amount lower than this is considered as dust value
// and majority of the miners don't pick txs w/ the following output value or lower
export const MINIMUM_AMOUNT_IN_SATS = 600;

const GenerateRefundableUTXOsOptions = Schema({
  // count: number.optional(),
  publicKey: string,
  pubKeyType: schema.addressTypes,
  destinationAddress: string.optional(),
  feeRate: number,
  enableRBF: boolean.optional(),
});

export default method({
  params: GenerateRefundableUTXOsOptions,
  handler: async ({ publicKey, pubKeyType, destinationAddress, feeRate, enableRBF }) => {
    const networkObj = getBitcoinNetwork();
    const format = addressNameToType[pubKeyType];
    const address = getAddressesFromPublicKey(publicKey, config.network, format)[0];

    // const { totalUTXOs, spendableUTXOs } = await OrditApi.fetchUnspentUTXOs({ address: address.address!, network });
    // if (!totalUTXOs) {
    //   throw new Error("No UTXOs found.");
    // }

    const outputs_ = await db.outputs.find({
      addresses: [address.address],
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

    const { spendableUTXOs } = utxo_.reduce(
      (acc, utxo) => {
        if (utxo.inscriptions?.length <= 0 || utxo.safeToSpend) {
          acc.spendableUTXOs.push(utxo);
        }

        return acc;
      },
      {
        spendableUTXOs: [],
        unspendableUTXOs: [],
      } as Record<string, any[]>
    );

    const utxo = spendableUTXOs.sort((a: any, b: any) => b.sats - a.sats)[0]; // Largest UTXO
    const psbt = new bitcoin.Psbt({ network: networkObj });
    const witnessScripts: Buffer[] = [];
    const input = await processInput({ utxo, pubKey: publicKey, network: config.network });
    const totalOutputs = 3;
    const outputs: { address: string; cardinals: number }[] = [];

    input.witnessUtxo?.script && witnessScripts.push(input.witnessUtxo?.script);
    psbt.addInput(input);

    if (enableRBF) {
      psbt.setInputSequence(0, 0xfffffffd); // hardcoded index because input is just one
    }

    const fees = calculateTxFee({
      totalInputs: 1,
      totalOutputs,
      satsPerByte: feeRate,
      type: pubKeyType,
      additional: { witnessScripts },
    });

    const remainingSats = utxo.sats - fees;
    for (let i = 0; i < totalOutputs; i++) {
      const usedAmount = outputs.reduce((acc, curr) => (acc += curr.cardinals), 0);
      const remainingAmount = remainingSats - usedAmount;
      const amount = [0, 1].includes(i) ? MINIMUM_AMOUNT_IN_SATS : remainingAmount;

      if (amount < MINIMUM_AMOUNT_IN_SATS) {
        throw new Error(
          `Not enough sats to generate ${totalOutputs} UTXOs with at least ${MINIMUM_AMOUNT_IN_SATS} sats per UTXO. Try decreasing the count or deposit more BTC`
        );
      }

      outputs.push({
        address: destinationAddress || address.address!,
        cardinals: amount,
      });
    }

    outputs.forEach((output) => {
      psbt.addOutput({
        address: output.address,
        value: output.cardinals,
      });
    });

    const inputsToSign: InputsToSign = {
      address: address.address!,
      signingIndexes: [0], // hardcoding because there will always be one input
    };

    return {
      hex: psbt.toHex(),
      base64: psbt.toBase64(),
      inputsToSign,
    };
  },
});

// type GenerateRefundableUTXOsOptionsType = Type<typeof GenerateRefundableUTXOsOptions>;

/**
 * post run steps:
 *
 * 0. GenerateRefundableUTXOs return `hexResponse`
 * 1. await window.unisat.signPsbt(hexResponse) // returns signedHex from browser console (open google home page and open console to run)
 * 2. in ordit-sdk, make sure `pnpm i`, then `npm run build:watch`
 * 3. open new terminal, cd to examples/node in ordit-sdk, run the following code: `npm run read` (under read.js, paste the following code):
 *    
import { OrditApi } from "@sadoprotocol/ordit-sdk"
import { Psbt } from "bitcoinjs-lib"

async function main() {
  const finalHex = Psbt.fromHex(signedHex).extractTransaction().toHex()
  const txId = await OrditApi.relayTx({ hex: finalHex, network: "testnet" })
  console.log({ txId })
}

main()
 * 4. use txid to verify refundable utxo setup
 */

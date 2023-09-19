import { method } from "@valkyr/api";
import * as bitcoin from "bitcoinjs-lib";
import Schema, { number, string } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { schema } from "../../Libraries/Schema";
import { rpc } from "../../Services/Bitcoin";
import { getSafeToSpendState, ord } from "../../Services/Ord";
import { addressNameToType, getAddressesFromPublicKey } from "../../Utilities/Address";
import { btcToSat } from "../../Utilities/Bitcoin";
import { convertBTCToSatoshis } from "../../Utilities/Bitcoin";
import { transformInscriptions } from "../../Utilities/Inscriptions";
import { processInput } from "../../Utilities/PSBT";
import { calculateTxFee, generateTxUniqueIdentifier, getExpandedTransaction } from "../../Utilities/Transaction";
import { MINIMUM_AMOUNT_IN_SATS } from "./CreatePsbt";
import { InputsToSign } from "./GenerateSellerPsbt";

// TODO: TEST: what happens if purchase amount lies in the 4th index of the utxos

// Input from seller PSBT when unwrapped & merged,
// is placed on the 2nd index in instant-buy-sell flow
export const INSTANT_BUY_SELLER_INPUT_INDEX = 2;

const GenerateBuyerInstantBuyPsbtOptions = Schema({
  publicKey: string,
  pubKeyType: schema.addressTypes,
  feeRate: number.optional(),
  inscriptionOutPoint: string,
  sellerPsbt: string,
  inscriptionDestinationAddress: string.optional(),
});

export default method({
  params: GenerateBuyerInstantBuyPsbtOptions,
  handler: async ({
    publicKey,
    pubKeyType,
    feeRate = 10,
    inscriptionOutPoint,
    sellerPsbt,
    inscriptionDestinationAddress,
  }) => {
    const networkObj = getBitcoinNetwork();
    const format = addressNameToType[pubKeyType];
    const address = getAddressesFromPublicKey(publicKey, config.network, format)[0];
    let ordOutNumber = 0;
    // get postage from outpoint

    const [ordTxId, ordOut] = inscriptionOutPoint.split(":");
    if (!ordTxId || !ordOut) {
      throw new Error("Invalid outpoint.");
    }

    ordOutNumber = parseInt(ordOut);
    // const { tx } = await OrditApi.fetchTx({ txId: ordTxId, network });
    const tx = await getExpandedTransaction(await rpc.transactions.getRawTransaction(ordTxId, true), { ord: true });
    // eslint-disable-next-line
    // @ts-ignore
    tx.vout = tx.vout.map((vout) => transformInscriptions(vout.inscriptions));
    if (!tx) {
      throw new Error("Failed to get raw transaction for id: " + ordTxId);
    }

    const output = tx && tx.vout[ordOutNumber];

    if (!output) {
      throw new Error("Outpoint not found.");
    }

    const postage = convertBTCToSatoshis(output.value);

    const outputs_ = await db.outputs.find({
      addresses: [address.address],
      ...noSpentsFilter,
    });

    // 3 = 2 refundables + 1 to cover for purchase
    if (outputs_.length < 3) {
      throw new Error("No suitable outputs found");
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
      utxo_.safeToSpend = getSafeToSpendState(tmp_utxo.ordinals, tmp_utxo.inscriptions, ["common"]);
    }

    const utxos = utxo_
      .reduce(
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
      )
      .spendableUTXOs.filter((utxo: any) => utxo.sats >= MINIMUM_AMOUNT_IN_SATS);
    // const utxo = utxo_.inscriptions.length <= 0 || utxo_.safeToSpend ? utxo_ : [];

    // 3 = 2 refundables + 1 to cover for purchase
    if (utxos.length < 3) {
      throw new Error("No suitable UTXOs found");
    } // check again

    // // 3 = 2 refundables + 1 to cover for purchase
    // if (utxos.length < 3) {
    //   throw new Error("No suitable UTXOs found");
    // }

    const psbt = new bitcoin.Psbt({ network: networkObj });
    let totalInput = postage;
    const witnessScripts: Buffer[] = [];
    const usedUTXOTxIds: string[] = [];
    const refundableUTXOs = [utxos[0]].concat(utxos[1]);
    for (let i = 0; i < refundableUTXOs.length; i++) {
      const refundableUTXO = refundableUTXOs[i];
      if (usedUTXOTxIds.includes(generateTxUniqueIdentifier(refundableUTXO.txid, refundableUTXO.n))) continue;

      const input = await processInput({ utxo: refundableUTXO, pubKey: publicKey, network: config.network });

      usedUTXOTxIds.push(generateTxUniqueIdentifier(input.hash, input.index));
      psbt.addInput(input);
      totalInput += refundableUTXO.sats;
    }

    // Add refundable output
    psbt.addOutput({
      address: address.address!,
      value: refundableUTXOs[0].sats + refundableUTXOs[1].sats,
    });

    // Add ordinal output
    psbt.addOutput({
      address: inscriptionDestinationAddress || address.address!,
      value: postage,
    });

    // seller psbt merge

    const decodedSellerPsbt = bitcoin.Psbt.fromHex(sellerPsbt, { network: networkObj });
    const sellPrice = (decodedSellerPsbt.data.globalMap.unsignedTx as any).tx.outs[0].value - postage;

    // inputs
    (psbt.data.globalMap.unsignedTx as any).tx.ins[INSTANT_BUY_SELLER_INPUT_INDEX] = (
      decodedSellerPsbt.data.globalMap.unsignedTx as any
    ).tx.ins[0];
    psbt.data.inputs[INSTANT_BUY_SELLER_INPUT_INDEX] = decodedSellerPsbt.data.inputs[0];
    // outputs
    (psbt.data.globalMap.unsignedTx as any).tx.outs[INSTANT_BUY_SELLER_INPUT_INDEX] = (
      decodedSellerPsbt.data.globalMap.unsignedTx as any
    ).tx.outs[0];
    psbt.data.outputs[INSTANT_BUY_SELLER_INPUT_INDEX] = decodedSellerPsbt.data.outputs[0];

    for (let i = 0; i < utxos.length; i++) {
      const utxo = utxos[i];
      if (usedUTXOTxIds.includes(generateTxUniqueIdentifier(utxo.txid, utxo.n))) continue;

      const input = await processInput({ utxo, pubKey: publicKey, network: config.network });
      input.witnessUtxo?.script && witnessScripts.push(input.witnessUtxo?.script);

      usedUTXOTxIds.push(generateTxUniqueIdentifier(input.hash, input.index));

      psbt.addInput(input);
      totalInput += utxo.sats;
    }

    const fee = calculateTxFee({
      totalInputs: psbt.txInputs.length,
      totalOutputs: psbt.txOutputs.length,
      satsPerByte: feeRate,
      type: pubKeyType,
      additional: { witnessScripts },
    });

    const totalOutput = psbt.txOutputs.reduce((partialSum, a) => partialSum + a.value, 0);

    const changeValue = totalInput - totalOutput - fee;
    if (changeValue < 0) {
      throw new Error("Insufficient funds to buy this inscription");
    }

    if (changeValue > MINIMUM_AMOUNT_IN_SATS) {
      psbt.addOutput({
        address: address.address!,
        value: changeValue,
      });
    }

    const inputsToSign = psbt.txInputs.reduce(
      (acc, _, index) => {
        if (index !== INSTANT_BUY_SELLER_INPUT_INDEX) {
          acc.signingIndexes = acc.signingIndexes.concat(index);
        }

        return acc;
      },
      {
        address: address.address!,
        signingIndexes: [],
      } as InputsToSign
    );

    return {
      hex: psbt.toHex(),
      base64: psbt.toBase64(),
      fee,
      postage,
      sellPrice,
      inputsToSign,
    };
  },
});

// type GenerateBuyerInstantBuyPsbtOptionsType = Type<typeof GenerateBuyerInstantBuyPsbtOptions>;

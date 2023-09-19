import { method } from "@valkyr/api";
import * as bitcoin from "bitcoinjs-lib";
import Schema, { number, string, Type } from "computed-types";

import { config } from "../../Config";
import { db } from "../../Database";
import { noSpentsFilter } from "../../Database/Output/Utilities";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { schema } from "../../Libraries/Schema";
import { rpc } from "../../Services/Bitcoin";
import { addressNameToType, getAddressesFromPublicKey } from "../../Utilities/Address";
import { btcToSat } from "../../Utilities/Bitcoin";
import { InputType, processInput, UTXORefined } from "../../Utilities/PSBT";

// const options = Schema({
//   ord: boolean.optional(),
//   hex: boolean.optional(),
//   witness: boolean.optional(),
// });

const GenerateSellerInstantBuyPsbtOptions = Schema({
  inscriptionOutPoint: string,
  price: number,
  receiveAddress: string,
  publicKey: string,
  pubKeyType: schema.addressTypes, //.optional(),
  // allowedrarity: array.of(string).optional(),
});

export default method({
  params: GenerateSellerInstantBuyPsbtOptions,
  handler: async ({ inscriptionOutPoint, price, receiveAddress, publicKey, pubKeyType }) => {
    const {
      inputs: [input],
      outputs: [output],
    } = await getSellerInputsOutputs({
      inscriptionOutPoint,
      price,
      receiveAddress,
      publicKey,
      pubKeyType,
    });

    const format = addressNameToType[pubKeyType];
    const { address } = getAddressesFromPublicKey(publicKey, config.network, format)[0];
    const networkObj = getBitcoinNetwork();
    const psbt = new bitcoin.Psbt({ network: networkObj });

    psbt.addInput(input);
    psbt.addOutput(output);

    const inputsToSign: InputsToSign = {
      address: address!,
      signingIndexes: [0], // hardcoding because there will always be one input
      sigHash: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
    };

    return {
      hex: psbt.toHex(),
      base64: psbt.toBase64(),
      inputsToSign, // TODO: enhancement - inputsToSign will be an array of objects
    };
  },
});

export async function getSellerInputsOutputs({
  inscriptionOutPoint,
  price,
  receiveAddress,
  publicKey,
  pubKeyType = "taproot",
}: GenerateSellerInstantBuyPsbtOptionsType) {
  const network = config.network;

  const format = addressNameToType[pubKeyType];
  const address = getAddressesFromPublicKey(publicKey, network, format)[0];

  const inputs: InputType[] = [];
  const outputs: { address: string; value: number }[] = [];

  const outputs_ = await db.outputs.find({
    addresses: [address.address],
    ...noSpentsFilter,
  });

  if (outputs_.length <= 0) {
    throw new Error("No outputs");
  }

  for (const { vout } of outputs_) {
    // required to be done in a loop to be sync
    const outpoint = `${vout.txid}:${vout.n}`;

    const inscriptions = await db.inscriptions.getInscriptionsByOutpoint(outpoint);

    if (inscriptions.length <= 0) {
      continue;
    }
    for (const { outpoint } of inscriptions) {
      if (outpoint === inscriptionOutPoint) {
        const tx = await rpc.transactions.getRawTransaction(vout.txid, true); // doesn't work in map
        const txVout = tx.vout[vout.n];

        const utxo: UTXORefined = {
          n: vout.n,
          blockHash: vout.block.hash,
          blockN: vout.block.height,
          sats: btcToSat(txVout.value),
          scriptPubKey: txVout.scriptPubKey,
          txid: vout.txid,
          value: txVout.value,
        };

        const input = await processInput({
          utxo,
          pubKey: publicKey,
          network,
          sighashType: bitcoin.Transaction.SIGHASH_SINGLE | bitcoin.Transaction.SIGHASH_ANYONECANPAY,
        });

        inputs.push(input);
        outputs.push({ address: receiveAddress, value: price + utxo.sats });

        return { inputs, outputs };
      }
    }
  }
  return { inputs, outputs };
}

type GenerateSellerInstantBuyPsbtOptionsType = Type<typeof GenerateSellerInstantBuyPsbtOptions>;

export interface InputsToSign {
  address: string;
  signingIndexes: number[];
  sigHash?: number;
}

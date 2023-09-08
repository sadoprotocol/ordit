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
      inputsToSign,
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
    addresses: address,
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

// async function fetchUnspentUTXOs({
//   address,
//   type,
//   decodeMetadata,
// }: {
//   address?: string;
//   type: string;
//   decodeMetadata?: true;
// }) {
//   if (!address) {
//     throw new Error("Invalid address");
//   }

//   const utxos = await rpc[network].call<UTXO[]>(
//     "GetUnspents",
//     {
//       address,
//       options: {
//         allowedrarity: rarity,
//         safetospend: type === "spendable",
//       },
//       pagination: {
//         limit: 50,
//       },
//       sort: { value: sort },
//     },
//     rpc.id
//   );

//   const { spendableUTXOs, unspendableUTXOs } = utxos.reduce(
//     (acc, utxo) => {
//       if (utxo.inscriptions?.length && !utxo.safeToSpend) {
//         utxo.inscriptions = decodeMetadata ? transformInscriptions(utxo.inscriptions) : utxo.inscriptions;

//         acc.unspendableUTXOs.push(utxo);
//       } else {
//         acc.spendableUTXOs.push(utxo);
//       }

//       return acc;
//     },
//     {
//       spendableUTXOs: [],
//       unspendableUTXOs: [],
//     } as Record<string, UTXO[]>
//   );

//   return {
//     totalUTXOs: utxos.length,
//     spendableUTXOs,
//     unspendableUTXOs,
//   };
// }

// function transformInscriptions(inscriptions: Inscription[] | undefined) {
//   if (!inscriptions) return [];

//   return inscriptions.map((inscription) => {
//     inscription.meta = inscription.meta ? decodeObject(inscription.meta) : inscription.meta;
//     return inscription;
//   });
// }

// function decodeObject(obj: NestedObject) {
//   return encodeDecodeObject(obj, { encode: false });
// }

// function encodeDecodeObject(obj: NestedObject, { encode, depth = 0 }: EncodeDecodeObjectOptions) {
//   const maxDepth = 5;

//   if (depth > maxDepth) {
//     throw new Error("Object too deep");
//   }

//   for (const key in obj) {
//     // eslint-disable-next-line
//     if (!obj.hasOwnProperty(key)) continue;

//     const value = obj[key];
//     if (isObject(value)) {
//       obj[key] = encodeDecodeObject(value as NestedObject, { encode, depth: depth++ });
//     } else if (isString(value)) {
//       obj[key] = encode ? encodeURIComponent(value as string) : decodeURIComponent(value as string);
//     }
//   }

//   return obj;
// }
// const isObject = (o: any) => o?.constructor === Object;
// const isString = (s: any) => s instanceof String || typeof s === "string";

type GenerateSellerInstantBuyPsbtOptionsType = Type<typeof GenerateSellerInstantBuyPsbtOptions>;

// type NestedObject = {
//   [key: string]: NestedObject | any;
// };

// type EncodeDecodeObjectOptions = {
//   encode: boolean;
//   depth?: number;
// };

export interface InputsToSign {
  address: string;
  signingIndexes: number[];
  sigHash?: number;
}

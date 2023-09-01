import { method } from "@valkyr/api";
import bitcoin, { Psbt } from "bitcoinjs-lib";
import Schema, { number, string, Type } from "computed-types";

import { config } from "../../Config";
import { getBitcoinNetwork } from "../../Libraries/Network";
import { schema } from "../../Libraries/Schema";
import { rpc } from "../../Services/Bitcoin";
import { addressNameToType, getAddressesFromPublicKey } from "../../Utilities/Address";
import { InputType, Inscription, processInput, UTXO } from "../../Utilities/PSBT";

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
  pubKeyType: schema.addressTypes.optional(),
});

export default method({
  params: GenerateSellerInstantBuyPsbtOptions,
  handler: async ({ inscriptionOutPoint, price, receiveAddress, publicKey, pubKeyType }) => {
    // const tx = await rpc.transactions.getRawTransaction(txid, true);
    // return getExpandedTransaction(tx, options);

    const { inputs, outputs } = await getSellerInputsOutputs({
      inscriptionOutPoint,
      price,
      receiveAddress,
      publicKey,
      pubKeyType,
    });

    const networkObj = getBitcoinNetwork();
    const psbt = new Psbt({ network: networkObj });

    psbt.addInput(inputs[0]);
    psbt.addOutput(outputs[0]);

    return {
      hex: psbt.toHex(),
      base64: psbt.toBase64(),
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

  const { totalUTXOs, unspendableUTXOs } = await fetchUnspentUTXOs({
    address: address.address!,
    // network,
    type: "all",
  });
  if (!totalUTXOs) {
    throw new Error("No UTXOs found");
  }

  const utxo = unspendableUTXOs.find((utxo) => utxo.inscriptions?.find((i) => i.outpoint === inscriptionOutPoint));
  if (!utxo) {
    throw new Error("Inscription not found");
  }

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

async function fetchUnspentUTXOs({
  address,
  type,
  decodeMetadata,
}: {
  address?: string;
  type: string;
  decodeMetadata?: true;
}) {
  if (!address) {
    throw new Error("Invalid address");
  }

  const utxos = await rpc[network].call<UTXO[]>(
    "GetUnspents",
    {
      address,
      options: {
        allowedrarity: rarity,
        safetospend: type === "spendable",
      },
      pagination: {
        limit: 50,
      },
      sort: { value: sort },
    },
    rpc.id
  );

  const { spendableUTXOs, unspendableUTXOs } = utxos.reduce(
    (acc, utxo) => {
      if (utxo.inscriptions?.length && !utxo.safeToSpend) {
        utxo.inscriptions = decodeMetadata ? transformInscriptions(utxo.inscriptions) : utxo.inscriptions;

        acc.unspendableUTXOs.push(utxo);
      } else {
        acc.spendableUTXOs.push(utxo);
      }

      return acc;
    },
    {
      spendableUTXOs: [],
      unspendableUTXOs: [],
    } as Record<string, UTXO[]>
  );

  return {
    totalUTXOs: utxos.length,
    spendableUTXOs,
    unspendableUTXOs,
  };
}

function transformInscriptions(inscriptions: Inscription[] | undefined) {
  if (!inscriptions) return [];

  return inscriptions.map((inscription) => {
    inscription.meta = inscription.meta ? decodeObject(inscription.meta) : inscription.meta;
    return inscription;
  });
}

function decodeObject(obj: NestedObject) {
  return encodeDecodeObject(obj, { encode: false });
}

function encodeDecodeObject(obj: NestedObject, { encode, depth = 0 }: EncodeDecodeObjectOptions) {
  const maxDepth = 5;

  if (depth > maxDepth) {
    throw new Error("Object too deep");
  }

  for (const key in obj) {
    // eslint-disable-next-line
    if (!obj.hasOwnProperty(key)) continue;

    const value = obj[key];
    if (isObject(value)) {
      obj[key] = encodeDecodeObject(value as NestedObject, { encode, depth: depth++ });
    } else if (isString(value)) {
      obj[key] = encode ? encodeURIComponent(value as string) : decodeURIComponent(value as string);
    }
  }

  return obj;
}
const isObject = (o: any) => o?.constructor === Object;
const isString = (s: any) => s instanceof String || typeof s === "string";

type GenerateSellerInstantBuyPsbtOptionsType = Type<typeof GenerateSellerInstantBuyPsbtOptions>;

type NestedObject = {
  [key: string]: NestedObject | any;
};

type EncodeDecodeObjectOptions = {
  encode: boolean;
  depth?: number;
};

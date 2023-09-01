import { BIP32Factory } from "bip32";
import bitcoin, { networks, payments } from "bitcoinjs-lib";
// import Schema, { Type } from "computed-types";
import * as ecc from "tiny-secp256k1";

import { config } from "../Config";
import { Network } from "../Libraries/Network";
import { getBitcoinNetwork } from "../Libraries/Network";
import { Vout } from "../Services/Bitcoin";

const network = config.network === "mainnet" ? networks.bitcoin : networks[config.network];
if (network === undefined) {
  throw new Error("invalid network", network);
}

export function getAddressessFromVout(vout: Vout) {
  if (vout.scriptPubKey.address !== undefined) {
    return [vout.scriptPubKey.address];
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses;
  }
  const address = extractAddress(vout.scriptPubKey.hex);
  if (address === undefined) {
    return [];
  }
  return [address];
}

function extractAddress(scriptPubKeyHex: string) {
  const scriptPubKey = Buffer.from(scriptPubKeyHex, "hex");

  try {
    const address = payments.p2pkh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2sh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2wpkh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  try {
    const address = payments.p2wsh({ output: scriptPubKey, network }).address;
    if (address) {
      return address;
    }
  } catch (e) {
    // ignore
  }

  return undefined;
}

export function getAddressesFromPublicKey(
  pubKey: string | Buffer,
  network: Network = "testnet",
  format: AddressTypes | "all" = "all"
) {
  if (!Buffer.isBuffer(pubKey)) {
    pubKey = Buffer.from(pubKey, "hex");
  }
  const bip32 = BIP32Factory(ecc);
  const networkObj = getBitcoinNetwork();
  const chainCode = Buffer.alloc(32).fill(1);

  const addresses: Address[] = [];

  let childNodeXOnlyPubkey = pubKey;

  const keys = bip32.fromPublicKey(pubKey, chainCode, networkObj);

  childNodeXOnlyPubkey = keys.publicKey.subarray(1, 33);

  if (format === "all") {
    const addressTypesList = Object.keys(addressTypeToName) as AddressTypes[];

    addressTypesList.forEach((addrType) => {
      if (addrType === "p2tr") {
        const paymentObj = createTransaction(childNodeXOnlyPubkey, addrType, network);

        addresses.push({
          address: paymentObj.address,
          xkey: childNodeXOnlyPubkey.toString("hex"),
          format: addressTypeToName[addrType],
          pub: keys.publicKey.toString("hex"),
        });
      } else {
        const paymentObj = createTransaction(keys.publicKey, addrType, network);

        addresses.push({
          address: paymentObj.address,
          format: addressTypeToName[addrType],
          pub: keys.publicKey.toString("hex"),
        });
      }
    });
  } else {
    const key = format === "p2tr" ? childNodeXOnlyPubkey : keys.publicKey;
    const paymentObj = createTransaction(key, format, network);

    addresses.push({
      address: paymentObj.address,
      format: addressTypeToName[format],
      pub: keys.publicKey.toString("hex"),
      xkey: format === "p2tr" ? childNodeXOnlyPubkey.toString("hex") : undefined,
    });
  }

  return addresses;
}

export function createTransaction(
  key: Buffer,
  type: AddressTypes,
  network: Network | bitcoin.Network,
  paymentOptions?: bitcoin.Payment
) {
  bitcoin.initEccLib(ecc);
  const networkObj = typeof network === "string" ? getBitcoinNetwork() : network;

  if (type === "p2tr") {
    return bitcoin.payments.p2tr({ internalPubkey: key, network: networkObj, ...paymentOptions });
  }

  if (type === "p2sh") {
    return bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: key, network: networkObj }),
      network: networkObj,
    });
  }

  return bitcoin.payments[type]({ pubkey: key, network: networkObj });
}

// export const addressFormats = {
//   mainnet: {
//     p2pkh: /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2sh: /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2wpkh: /^(bc1[qp])[a-zA-HJ-NP-Z0-9]{14,74}$/,
//     p2tr: /^(bc1p)[a-zA-HJ-NP-Z0-9]{14,74}$/,
//   },
//   testnet: {
//     p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2wpkh: /^(tb1[qp]|bcrt1[qp])[a-zA-HJ-NP-Z0-9]{14,74}$/,
//     p2tr: /^(tb1p|bcrt1p)[a-zA-HJ-NP-Z0-9]{14,74}$/,
//   },
//   regtest: {
//     p2pkh: /^[mn][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2sh: /^[2][a-km-zA-HJ-NP-Z1-9]{25,34}$/,
//     p2wpkh: /^(tb1[qp]|bcrt1[qp])[a-zA-HJ-NP-Z0-9]{14,74}$/,
//     p2tr: /^(tb1p|bcrt1p)[a-zA-HJ-NP-Z0-9]{14,74}$/,
//   },
// } as const;

export const addressTypeToName = {
  p2pkh: "legacy",
  p2sh: "nested-segwit",
  p2wpkh: "segwit",
  p2tr: "taproot",
} as const;

export const addressNameToType = {
  legacy: "p2pkh",
  segwit: "p2wpkh",
  "nested-segwit": "p2sh",
  taproot: "p2tr",
} as const;

export type AddressTypes = keyof typeof addressTypeToName;
// export type AddressFormats = (typeof addressTypeToName)[AddressTypes];
// export type AddressFormatSchema = Schema.either()

type Address = {
  address: string | undefined;
  xkey?: string;
  format: string;
  pub: string;
};

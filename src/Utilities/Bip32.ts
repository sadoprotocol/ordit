import BIP32Factory from "bip32";
import { initEccLib, Network, payments } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

initEccLib(ecc);

export const bip32 = BIP32Factory(ecc);

export function getAddresses(key: string, network: Network): Address[] {
  const addresses: Address[] = [];
  const chainCode = Buffer.alloc(32).fill(1);

  let pubkey: Buffer | undefined;
  let xpubkey: Buffer | undefined;

  try {
    const { publicKey } = bip32.fromPublicKey(Buffer.from(key, "hex"), chainCode, network);
    pubkey = publicKey;
    xpubkey = publicKey.slice(1, 33);
  } catch {
    pubkey = Buffer.from(key, "hex");
  }

  const p2pkh = getP2pkhAddress(pubkey, network);
  if (p2pkh !== undefined) {
    addresses.push({
      value: p2pkh,
      format: "legacy",
      pub: pubkey.toString("hex"),
    });
  }

  const p2sh = getP2shAddress(pubkey, network);
  if (p2sh !== undefined) {
    addresses.push({
      value: p2sh,
      format: "segwit",
      pub: pubkey.toString("hex"),
    });
  }

  const p2wpkh = getP2wpkhAddress(pubkey, network);
  if (p2wpkh !== undefined) {
    addresses.push({
      value: p2wpkh,
      format: "bech32",
      pub: pubkey.toString("hex"),
    });
  }

  if (xpubkey !== undefined) {
    const p2tr = getP2trAddress(xpubkey, network);
    if (p2tr !== undefined) {
      addresses.push({
        value: p2tr,
        format: "taproot",
        xkey: xpubkey.toString("hex"),
        pub: key,
      });
    }
  }

  return addresses;
}

export function isTaprootAddress(address: Address): address is TaprootAddress {
  return address.format === "taproot";
}

function getP2pkhAddress(key: Buffer | string, network: Network): string | undefined {
  const pubkey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");
  return payments.p2pkh({ pubkey, network }).address;
}

function getP2shAddress(key: Buffer | string, network: Network): string | undefined {
  const pubkey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");
  return payments.p2sh({ redeem: payments.p2wpkh({ pubkey, network }), network }).address;
}

function getP2wpkhAddress(key: Buffer | string, network: Network): string | undefined {
  const pubkey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");
  return payments.p2wpkh({ pubkey, network }).address;
}

function getP2trAddress(key: Buffer | string, network: Network): string | undefined {
  const pubkey = Buffer.isBuffer(key) ? key : Buffer.from(key, "hex");
  return payments.p2tr({ internalPubkey: pubkey, network }).address;
}

type Address = CoreAddress | TaprootAddress;

type CoreAddress = {
  value: string;
  format: "legacy" | "segwit" | "bech32";
  pub: string;
};

type TaprootAddress = {
  value: string;
  format: "taproot";
  xkey: string;
  pub: string;
};

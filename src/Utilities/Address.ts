import { networks, payments } from "bitcoinjs-lib";

import { config } from "../Config";
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

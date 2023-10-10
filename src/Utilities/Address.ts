import { address as addr, networks, payments } from "bitcoinjs-lib";

import { rpc } from "~Services/Bitcoin";

import { config } from "../Config";
import { Vout } from "../Services/Bitcoin";

const network = config.network === "mainnet" ? networks.bitcoin : networks[config.network];
if (network === undefined) {
  throw new Error("invalid network", network);
}

export async function getAddressessFromVout(vout: Vout) {
  if (vout.scriptPubKey.address !== undefined) {
    return [vout.scriptPubKey.address];
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses;
  }
  const address = extractAddress(Buffer.from(vout.scriptPubKey.hex, "hex"));
  if (address !== undefined) {
    return [address];
  }
  if (vout.scriptPubKey.desc !== undefined) {
    return rpc.util.deriveAddresses(vout.scriptPubKey.desc).catch(() => []);
  }
  return [];
}

function extractAddress(script: Buffer) {
  try {
    const address = addr.fromOutputScript(script, network);
    if (address) {
      return address;
    }
  } catch {
    // ignore
  }

  try {
    const address = payments.p2pkh({ output: script, network }).address;
    if (address) {
      return address;
    }
  } catch {
    // ignore
  }

  try {
    const address = payments.p2sh({ output: script, network }).address;
    if (address) {
      return address;
    }
  } catch {
    // ignore
  }

  try {
    const address = payments.p2wpkh({ output: script, network }).address;
    if (address) {
      return address;
    }
  } catch {
    // ignore
  }

  try {
    const address = payments.p2wsh({ output: script, network }).address;
    if (address) {
      return address;
    }
  } catch {
    // ignore
  }

  return undefined;
}

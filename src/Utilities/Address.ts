import { address as addr } from "bitcoinjs-lib";

import { getBitcoinNetwork } from "~Libraries/Network";

import { Vout } from "../Services/Bitcoin";

const network = getBitcoinNetwork();
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
  return [];
}

function extractAddress(script: Buffer) {
  if (script[0] === 0x6a) {
    return; // Return empty array for OP_RETURN
  }
  try {
    const address = addr.fromOutputScript(script, network);
    if (address) {
      return address;
    }
  } catch {
    // Ignore no address found
  }
  return;
}

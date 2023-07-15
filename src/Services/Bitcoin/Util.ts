import { rpc } from "./Rpc";

const NO_CORRESPONDING_ADDRESS = -5;

export const util = {
  code: {
    NO_CORRESPONDING_ADDRESS,
  },
  deriveAddresses,
};

/*
 |--------------------------------------------------------------------------------
 | Methods
 |--------------------------------------------------------------------------------
 */

/**
 * Derives one or more addresses corresponding to an output descriptor.
 *
 * Examples of output descriptors are:
 *
 * pkh(<pubkey>) P2PKH outputs for the given pubkey wpkh(<pubkey>) Native segwit
 * P2PKH outputs for the given pubkey sh(multi(<n>,<pubkey>,<pubkey>,…))
 * P2SH-multisig outputs for the given threshold and pubkeys raw(<hex script>)
 * Outputs whose scriptPubKey equals the specified hex scripts
 *
 * In the above, <pubkey> either refers to a fixed public key in hexadecimal
 * notation, or to an xpub/xprv optionally followed by one or more path elements
 * separated by “/”, where “h” represents a hardened child key.
 *
 * @param descriptor - The descriptor.
 * @param range      - If a ranged descriptor is used, this specifies the end or
 *                     the range (in [begin,end] notation) to derive.
 */
async function deriveAddresses(descriptor: string, range?: number | [number, number]): Promise<string[]> {
  const args: [string, (number | [number, number])?] = [descriptor];
  if (range !== undefined) {
    args.push(range);
  }
  return rpc<string[]>("deriveaddresses", args);
}

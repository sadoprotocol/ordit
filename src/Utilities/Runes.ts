import { isRunestone, tryDecodeRunestone } from "runestone-lib";

import { rpc } from "~Services/Bitcoin";

export async function outputHasRunes(outpoint: string): Promise<boolean> {
  const [txid, n] = outpoint.split(":");
  const tx = await rpc.transactions.getRawTransaction(txid, true);
  if (!tx) return false;
  const decipher = tryDecodeRunestone(tx);
  if (!decipher) return false;
  if (!isRunestone(decipher)) return false;

  const pointer = decipher.pointer ?? 1;
  if (decipher.etching || decipher.mint) {
    if (Number(n) === pointer) return true;
  }
  if (decipher.edicts) {
    return decipher.edicts.some((edict) => Number(n) === edict.output);
  }

  return false;
}

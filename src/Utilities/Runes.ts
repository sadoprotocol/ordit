import { runes } from "~Database/Runes";

export async function outputHasRunes(outpoint: string): Promise<boolean> {
  const [txid, n] = outpoint.split(":");
  const balances = await runes.getUtxoBalance(txid, Number(n));
  return balances.length > 0;
}

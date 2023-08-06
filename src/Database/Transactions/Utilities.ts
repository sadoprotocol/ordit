import { RawTransaction } from "../../Services/Bitcoin";
import { getAddressessFromVout } from "../../Utilities/Address";

/**
 * Get list of unique addresses from the given transaction.
 *
 * @param tx - Transaction to get addresses from.
 */
export async function getAddressesFromTx(tx: RawTransaction): Promise<string[]> {
  const addresses = new Set<string>();
  for (const vout of tx.vout) {
    const address = getAddressessFromVout(vout)[0];
    if (address !== undefined) {
      addresses.add(address);
    }
  }
  return Array.from(addresses);
}

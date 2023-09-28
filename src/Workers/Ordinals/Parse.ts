import { log } from "../../Libraries/Log";
import { COIN_VALUE, SUBSIDY_HALVING_INTERVAL } from "../../Libraries/Ordinals/Constants";
import { RawTransaction, rpc, TxVin } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { SatRange } from "./SatRange";

const cache = new Map<string, SatRange[]>();

export async function parse() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  let height = 0;
  while (height < blockHeight) {
    const block = await rpc.blockchain.getBlock(height, 2);

    const first = firstOrdinal(block.height);
    const coinbaseInputs: SatRange[] = [[first, first + subsidy(block.height)]];

    for (let i = 1; i < block.tx.length; i++) {
      const tx = block.tx[i];

      const input_sat_ranges: SatRange[] = [];

      for (const vin of tx.vin) {
        const key = `${(vin as TxVin).txid}:${(vin as TxVin).vout}`;
        const sat_ranges = cache.get(key);
        if (sat_ranges === undefined) {
          throw new Error(`Could not find outpoint ${key.toString()} in index`);
        }
        input_sat_ranges.push(...sat_ranges);
      }

      indexTransactionSats(tx, input_sat_ranges);

      coinbaseInputs.push(...input_sat_ranges);
    }

    indexTransactionSats(block.tx[0], coinbaseInputs);

    log(`\r${height.toLocaleString()} / ${blockHeight.toLocaleString()}`);

    height += 1;
  }
}

function indexTransactionSats(tx: RawTransaction, inputSatRanges: SatRange[]) {
  for (const vout of tx.vout) {
    const outpoint = `${tx.txid}:${vout.n}`;
    const sats: SatRange[] = [];

    let remaining = btcToSat(vout.value);
    while (remaining > 0) {
      const range = inputSatRanges.shift();
      if (!range) {
        return console.log("Insufficient inputs for transaction outputs");
      }

      const count = range[1] - range[0];
      const assigned: SatRange = count > remaining ? handleSatRangeOverflow(range, remaining, inputSatRanges) : range;

      sats.push(assigned);

      remaining -= assigned[1] - assigned[0];
    }

    cache.set(outpoint, sats);
  }
}

function handleSatRangeOverflow(range: SatRange, remaining: number, inputSatRanges: SatRange[]): SatRange {
  const middle = range[0] + remaining;
  inputSatRanges.unshift([middle, range[1]]);
  return [range[0], middle];
}

function firstOrdinal(height: number): number {
  let start = 0;
  for (let h = 0; h < height; h++) {
    start += subsidy(h);
  }
  return start;
}

function subsidy(height: number): number {
  return Math.floor((50 * COIN_VALUE) / Math.pow(2, Math.floor(height / SUBSIDY_HALVING_INTERVAL)));
}

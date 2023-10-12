import { INSCRIPTION_EPOCH_BLOCK } from "~Libraries/Inscriptions/Constants";
import { limiter } from "~Libraries/Limiter";
import { log, perf } from "~Libraries/Log";
import { COIN_VALUE, SUBSIDY_HALVING_INTERVAL } from "~Libraries/Ordinals/Constants";
import { RawTransaction, rpc } from "~Services/Bitcoin";
import { redis } from "~Services/Redis";
import { btcToSat } from "~Utilities/Bitcoin";

import { SatRange } from "./SatRange";

const cache = new Map<string, SatRange[]>();
const spent: string[] = [];

export async function parse() {
  const blockHeight = await rpc.blockchain.getBlockCount();

  let height = (await redis.get("sats:height").then((value) => (value === null ? -1 : parseInt(value)))) + 1;
  let hash = await rpc.blockchain.getBlockHash(height);

  while (height < blockHeight) {
    const block = await rpc.blockchain.getBlock(hash, 2);

    const first = firstOrdinal(block.height);
    const coinbaseInputs: SatRange[] = [[first, first + subsidy(block.height)]];

    for (let i = 1; i < block.tx.length; i++) {
      const tx = block.tx[i];

      const input_sat_ranges: SatRange[] = [];

      for (const vin of tx.vin) {
        const key = `${vin.txid}:${vin.vout}`;
        const sat_ranges =
          cache.get(key) ?? (await redis.get(key).then((value) => (value === null ? undefined : JSON.parse(value))));
        if (sat_ranges === undefined) {
          throw new Error(`Could not find outpoint ${key.toString()} in index`);
        }
        mergeSatRanges(input_sat_ranges, sat_ranges);
        cache.delete(key);
        spent.push(key);
      }

      indexTransactionSats(tx, input_sat_ranges);
      mergeSatRanges(coinbaseInputs, input_sat_ranges);
    }

    indexTransactionSats(block.tx[0], coinbaseInputs);

    log(
      `\rOutpoints ${cache.size.toLocaleString()} | Spent ${spent.length.toLocaleString()} | ${height.toLocaleString()} / ${blockHeight.toLocaleString()}`,
    );

    if (height >= INSCRIPTION_EPOCH_BLOCK - 1) {
      break;
    }

    if (hasReachedTreshold(height)) {
      await commit(height);
    }

    hash = block.nextblockhash;
    height += 1;
  }

  await commit(height);
}

async function commit(height: number) {
  let ts = perf();

  const items = cache.size;
  let ranges = 0;

  const cacheDrainer = limiter(10);
  for (const [key, value] of cache) {
    ranges += value.length;
    cacheDrainer.push(() => redis.set(key, JSON.stringify(value)));
    cache.delete(key);
  }
  await cacheDrainer.run();

  log(`\n\n💽 Inserted ${ranges.toLocaleString()} ranges in ${items.toLocaleString()} outpoints [${ts.now} seconds]`);

  ts = perf();
  let outpoints = 0;

  const spentDrainer = limiter(10);
  for (const key of spent) {
    outpoints += 1;
    spentDrainer.push(() => redis.del(key));
  }
  await spentDrainer.run();

  await redis.set("sats:height", height.toString());

  spent.length = 0;

  log(`\n💽 Removed ${outpoints.toLocaleString()} outpoints [${ts.now} seconds]\n\n`);
}

function hasReachedTreshold(height: number) {
  if (height !== 0 && height % 5_000 === 0) {
    return true;
  }
  // if (cache.size > 200_000) {
  //   return true;
  // }
  // if (spent.length > 200_000) {
  //   return true;
  // }
  return false;
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

function mergeSatRanges(range1: SatRange[], range2: SatRange[]) {
  const chunkSize = 50_000;
  for (let i = 0; i < range2.length; i += chunkSize) {
    const chunk = range2.slice(i, i + chunkSize);
    range1.push(...chunk);
  }
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

import { db } from "../../Database";
import { COIN_VALUE, SUBSIDY_HALVING_INTERVAL } from "../../Libraries/Ordinals/Constants";
import { Range } from "../../Libraries/Ordinals/Range";
import { Block, rpc, TxVin } from "../../Services/Bitcoin";
import { btcToSat } from "../../Utilities/Bitcoin";
import { log } from "../Log";

export async function parse() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  let height = 0;
  while (height < blockHeight) {
    const block = await rpc.blockchain.getBlock(height, 2);
    await assignOrdinals(block);
    log(`\r${height.toLocaleString()} / ${blockHeight.toLocaleString()}`);
    height += 1;
  }
}

async function assignOrdinals(block: Block<2>) {
  const first = firstOrdinal(block.height);
  const last = first + subsidy(block.height);

  const coinbase = new Range(first, last);
  const coinbaseTransaction = block.tx.shift()!;

  for (const tx of block.tx) {
    const ranges: Range[] = [];
    const outputs: { txid: string; n: number; sats: [number, number][] }[] = [];

    const inputs = await db.outputs.find({
      $or: tx.vin.map((vin) => ({ "vout.txid": (vin as TxVin).txid, "vout.n": (vin as TxVin).vout })),
    });
    for (const input of inputs) {
      ranges.push(...input.sats.map(([first, last]) => new Range(first, last)));
    }

    for (const vout of tx.vout) {
      outputs.push({
        txid: tx.txid,
        n: vout.n,
        sats: getSats(btcToSat(vout.value), ranges),
      });
    }

    await db.outputs.addSats(outputs);
  }

  const outputs: { txid: string; n: number; sats: [number, number][] }[] = [];
  for (const output of coinbaseTransaction.vout) {
    outputs.push({
      txid: coinbaseTransaction.txid,
      n: output.n,
      sats: getSats(btcToSat(output.value), [coinbase]),
    });
  }
  await db.outputs.addSats(outputs);
}

function getSats(value: number, ranges: Range[]): [number, number][] {
  const result: [number, number][] = [];

  let remaining = value;
  while (remaining > 0) {
    const current = ranges.shift();
    if (!current) {
      break;
    }

    const [next, prev] = current.grab(remaining);

    result.push(next.toArray());
    remaining -= next.value;

    if (prev) {
      ranges.unshift(prev);
    }
  }

  return result;
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

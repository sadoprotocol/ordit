import { db } from "../../../Database";
import { OutputDocument, SpentOutput } from "../../../Database/Output";
import { SPENTS_DATA } from "../../../Paths";
import { isCoinbase, rpc } from "../../../Services/Bitcoin";
import { getAddressessFromVout } from "../../../Utilities/Address";
import { writeFile } from "../../../Utilities/Files";
import { log, perf } from "../../Log";

export async function crawl(blockN: number, maxBlockN: number) {
  if (blockN > maxBlockN) {
    log("\n   💤 Indexer has latest outputs");
    return 0;
  }

  log(`\n   📦 parsing outputs from block ${blockN}`);

  let ts = perf();
  const block = await rpc.blockchain.getBlock(blockN, 2);
  log(`\n     💿 loaded block, processing ${block.tx.length.toLocaleString()} transactions [${ts.now} seconds]`);

  // ### Documents

  const outputs: OutputDocument[] = [];
  const spents: SpentOutput[] = [];

  ts = perf();
  for (const tx of block.tx) {
    let n = 0;
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        break;
      }
      spents.push({
        vout: {
          txid: vin.txid,
          n: vin.vout,
        },
        vin: {
          block: {
            hash: block.hash,
            height: block.height,
          },
          txid: tx.txid,
          n,
        },
      });
      n += 1;
    }
    for (const vout of tx.vout) {
      outputs.push({
        addresses: getAddressessFromVout(vout),
        value: vout.value,
        vout: {
          block: {
            hash: block.hash,
            height: block.height,
          },
          txid: tx.txid,
          n: vout.n,
        },
        sats: [],
      });
    }
  }

  log(
    `\n     🏷️ transactions parsed ${outputs.length.toLocaleString()} outputs and ${spents.length.toLocaleString()} spents [${
      ts.now
    } seconds]`
  );

  // ### Insert

  ts = perf();

  await db.outputs.insertMany(outputs);
  await writeFile(`${SPENTS_DATA}/${block.height}`, JSON.stringify(spents));

  log(`\n     💾 saved ${outputs.length.toLocaleString()} outputs [${ts.now} seconds]`);

  return outputs.length;
}

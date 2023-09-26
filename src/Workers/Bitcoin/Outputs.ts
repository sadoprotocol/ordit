import { db } from "../../Database";
import { OutputDocument, SpentOutput } from "../../Database/Output";
import { log, perf } from "../../Libraries/Log";
import { isCoinbase, rpc } from "../../Services/Bitcoin";
import { getAddressessFromVout } from "../../Utilities/Address";

export async function parse(blockHeight: number) {
  let height = (await db.outputs.getHeighestBlock()) + 1;

  if (height > blockHeight) {
    return log("\n   💤 Indexer has latest outputs");
  }

  while (height <= blockHeight) {
    await handleBlock(height);
    height += 1;
  }
}

async function handleBlock(height: number) {
  log(`\n   📦 parsing outputs from block ${height}`);

  let ts = perf();
  const block = await rpc.blockchain.getBlock(height, 2);
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
      });
    }
  }

  log(
    `\n     🏷️ transactions parsed ${outputs.length.toLocaleString()} outputs and ${spents.length.toLocaleString()} spents [${
      ts.now
    } seconds]`,
  );

  // ### Insert

  ts = perf();

  await db.outputs.insertMany(outputs);
  await db.outputs.addSpents(spents);

  log(
    `\n     💾 saved ${outputs.length.toLocaleString()} outputs and ${spents.length.toLocaleString()} spents [${
      ts.now
    } seconds]`,
  );
}

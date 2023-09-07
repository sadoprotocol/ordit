import { db } from "../../../Database";
import { OutputDocument, SpentOutput } from "../../../Database/Output";
import { SPENTS_DATA } from "../../../Paths";
import { isCoinbase, rpc } from "../../../Services/Bitcoin";
import { getAddressessFromVout } from "../../../Utilities/Address";
import { writeFile } from "../../../Utilities/Files";
import { log } from "../../Log";

export async function crawl(blockN: number, maxBlockN: number) {
  if (blockN > maxBlockN) {
    log("\n   💤 Indexer has latest outputs");
    return 0;
  }

  const blockHash = await rpc.blockchain.getBlockHash(blockN);
  const block = await rpc.blockchain.getBlock(blockHash, 2);

  // ### Documents

  const outputs: OutputDocument[] = [];
  const spents: SpentOutput[] = [];

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

  // ### Insert

  await db.outputs.insertMany(outputs);
  await writeFile(`${SPENTS_DATA}/${block.height}`, JSON.stringify(spents));

  return outputs.length;
}

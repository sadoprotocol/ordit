import { bootstrap } from "../../Bootstrap";
import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";
import { getInscriptionContent } from "../../Utilities/Inscriptions";
import { log } from "../Log";

main().then(() => process.exit(0));

async function main() {
  await bootstrap();
  const blockN = await rpc.blockchain.getBlockCount();
  let height = 0;
  while (height <= blockN) {
    const promises: Promise<any>[] = [];
    const block = await rpc.blockchain.getBlock(height, 2);
    for (const tx of block.tx) {
      const data = getInscriptionContent(tx);
      if (data === undefined) {
        continue;
      }
      const inscriptionId = `${tx.txid}i0`;
      promises.push(
        db.inscriptions.updateOne(
          { id: inscriptionId },
          {
            $set: {
              mediaContent: data.media.content.toString("base64"),
              mediaSize: data.media.content.length,
            },
          }
        )
      );
      log(`\n[${height}/${blockN}] Updated inscription ${inscriptionId}`);
    }
    await Promise.all(promises);
    height += 1;
  }
}

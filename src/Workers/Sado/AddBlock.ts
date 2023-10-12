import { db } from "../../Database";
import { SADO_DATA } from "../../Paths";
import { Block } from "../../Services/Bitcoin";
import { writeFile } from "../../Utilities/Files";
import { sado, SadoEntry } from "../../Utilities/Sado";

export async function addBlock(block: Block<2>) {
  const orders: SadoEntry[] = [];
  const offers: SadoEntry[] = [];

  const txs = sado.getTransactions(block.tx);
  for (const { type, cid, txid } of txs) {
    switch (type) {
      case "order": {
        orders.push({ cid, txid });
        break;
      }
      case "offer": {
        offers.push({ cid, txid });
        break;
      }
    }
  }

  if (orders.length > 0 || offers.length > 0) {
    await writeFile(
      `${SADO_DATA}/${block.height}`,
      JSON.stringify({
        block: {
          hash: block.hash,
          height: block.height,
          time: block.time,
        },
        orders,
        offers,
      }),
    );
  }

  await db.sado.events.setBlockNumber(block.height);
}

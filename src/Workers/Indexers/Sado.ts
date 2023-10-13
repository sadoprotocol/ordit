import { db } from "~Database";
import { parseOffer, parseOrder } from "~Database/Sado";
import { Indexer, IndexHandler, VoutData } from "~Libraries/Indexer/Indexer";
import { perf } from "~Libraries/Log";
import { sado, SadoEntry } from "~Libraries/Sado";
import { RawTransaction, rpc } from "~Services/Bitcoin";
import { getAddressessFromVout } from "~Utilities/Address";

export const sadoIndexer: IndexHandler = {
  name: "sado",

  async run(indexer: Indexer, { log }) {
    let ts = perf();

    const [orders, offers] = getSadoItems(indexer.vouts);
    log(
      `🚚 Delivering ${orders.length.toLocaleString()} orders and ${offers.length.toLocaleString()} offers [${
        ts.now
      } seconds]`,
    );

    // ### Orders

    ts = perf();
    for (const {
      cid,
      block,
      tx: { txid },
    } of orders) {
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      await db.sado.events.insertOne({
        cid,
        type: "order",
        addresses: await getAddressesFromTx(tx),
        txid,
        height: block.height,
      });
      await parseOrder(cid, { ...block, txid });
    }
    log(`💾 Saved ${orders.length.toLocaleString()} orders [${ts.now} seconds]`);

    // ### Offers

    ts = perf();
    for (const {
      cid,
      block,
      tx: { txid },
    } of offers) {
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      await db.sado.events.insertOne({
        cid,
        type: "offer",
        addresses: await getAddressesFromTx(tx),
        txid,
        height: block.height,
      });
      await parseOffer(cid, { ...block, txid });
    }
    log(`💾 Saved ${offers.length.toLocaleString()} offers [${ts.now} seconds]`);
  },

  async reorg(height: number) {
    await Promise.all([
      db.sado.events.deleteMany({ height: { $gte: height } }),
      db.sado.orders.deleteMany({ "block.height": { $gte: height } }),
    ]);
  },
};

function getSadoItems(vouts: VoutData[]) {
  const orders: SadoEntry[] = [];
  const offers: SadoEntry[] = [];

  const txs = sado.getTransactions(vouts);
  for (const { type, cid, block, tx } of txs) {
    switch (type) {
      case "order": {
        orders.push({ cid, block, tx });
        break;
      }
      case "offer": {
        offers.push({ cid, block, tx });
        break;
      }
    }
  }

  return [orders, offers];
}

async function getAddressesFromTx(tx: RawTransaction): Promise<string[]> {
  const addresses: string[] = [];
  for (const vout of tx.vout) {
    addresses.push(...(await getAddressessFromVout(vout)));
  }
  return addresses;
}

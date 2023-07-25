import { WithId } from "mongodb";

import { Options } from "../../Methods/Address/GetTransactions";
import { RawTransaction, rpc } from "../../Services/Bitcoin";
import { getExpandedTransaction } from "../../Utilities/Transaction";
import { getAddressFromVout } from "../../Workers/Bitcoin/Crawl";
import { getVoutByFilter, getVoutsByAddress } from "../Vout";
import { collection, TransactionDocument } from "./Collection";

export async function getTransactionsByAddress(
  address: string,
  options?: Options
): Promise<WithId<TransactionDocument>[]> {
  const transactions = await collection.find({ addresses: address }).toArray();

  const txIds = new Set<string>();
  for (const transaction of transactions) {
    txIds.add(transaction.txid);
  }

  const vouts = await getVoutsByAddress(address, { txid: { $nin: Array.from(txIds) } });
  for (const vout of vouts) {
    const tx = await rpc.transactions.getRawTransaction(vout.txid, true);
    if (tx === undefined) {
      continue;
    }
    const document: TransactionDocument = {
      addresses: await getAddressesFromTx(tx),
      blockHeight: vout.blockN,
      ...(await getExpandedTransaction(tx, options)),
    };
    const result = await collection.insertOne(document);
    (document as WithId<TransactionDocument>)._id = result.insertedId;
    transactions.push(document as WithId<TransactionDocument>);
  }

  const updates: Promise<any>[] = [];
  for (const transaction of transactions) {
    let hasChanges = false;
    for (const vout of transaction.vout) {
      if (vout.spent === false) {
        const currentVout = await getVoutByFilter({ txid: transaction.txid, n: vout.n });
        if (currentVout !== undefined && currentVout.nextTxid !== undefined) {
          hasChanges = true;
          vout.spent = `${currentVout.nextTxid}:${currentVout.vin}`;
          vout.ordinals = [];
          vout.inscriptions = [];
        }
      }
    }
    if (hasChanges) {
      updates.push(collection.updateOne({ _id: transaction._id }, { $set: { vout: transaction.vout } }));
    }
  }
  await Promise.all(updates);

  return transactions.sort((a, b) => b.blockHeight - a.blockHeight);
}

async function getAddressesFromTx(tx: RawTransaction): Promise<string[]> {
  const addresses = new Set<string>();
  for (const vout of tx.vout) {
    const address = await getAddressFromVout(vout);
    if (address !== undefined) {
      addresses.add(address);
    }
  }
  return Array.from(addresses);
}

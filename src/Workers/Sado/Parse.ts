import debug from "debug";

import { db } from "../../Database";
import { parseOffer } from "../../Database/SadoOrders/Utilities/ParseOffer";
import { parseOrder } from "../../Database/SadoOrders/Utilities/ParseOrder";
import { SADO_DATA } from "../../Paths";
import { RawTransaction, rpc } from "../../Services/Bitcoin";
import { getAddressessFromVout } from "../../Utilities/Address";
import { readDir, readFile, removeFile } from "../../Utilities/Files";
import { SadoEntry } from "./AddBlock";

const log = debug("sado-parser");

export async function parse() {
  const blocks = await readDir(SADO_DATA);
  if (blocks.length === 0) {
    return log("all items processed");
  }

  log("processing %d items", blocks.length);

  for (const block of blocks) {
    const data = await readFile(`${SADO_DATA}/${block}`);
    if (data === undefined) {
      return;
    }

    // ### Block JSON

    const json = getParsedBlock(data);
    if (json === undefined) {
      throw new Error(`Failed to parse block ${block}`);
    }

    // ### Orders

    for (const { cid, txid } of json.orders) {
      log("processing order %s", cid);
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      await db.sado.insertOne({
        cid,
        type: "order",
        addresses: getAddressesFromTx(tx),
        txid,
        height: json.block.height,
      });
      await parseOrder(cid, { ...json.block, txid });
    }

    // ### Offers

    for (const { cid, txid } of json.offers) {
      log("processing offer %s", cid);
      const tx = await rpc.transactions.getRawTransaction(txid, true);
      if (tx === undefined) {
        continue;
      }
      await db.sado.insertOne({
        cid,
        type: "offer",
        addresses: getAddressesFromTx(tx),
        txid,
        height: json.block.height,
      });
      await parseOffer(cid, { ...json.block, txid });
    }

    // ### Cleanup
    // After all entries has been parsed we can remove the block file. This only
    // happens if all entries has been parsed successfully. If an error occurs
    // the block will be reprocessed on the next run.

    await removeFile(`${SADO_DATA}/${block}`);
  }
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

function getParsedBlock(data: string): SadoBlock | undefined {
  try {
    return JSON.parse(data) as SadoBlock;
  } catch {
    return;
  }
}

function getAddressesFromTx(tx: RawTransaction): string[] {
  const addresses: string[] = [];
  for (const vout of tx.vout) {
    addresses.push(...getAddressessFromVout(vout));
  }
  return addresses;
}

type SadoBlock = {
  block: {
    hash: string;
    height: number;
    time: number;
  };
  orders: SadoEntry[];
  offers: SadoEntry[];
};

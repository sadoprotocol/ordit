import { db } from "../../Database";
import { parseOffer } from "../../Database/Sado/Utilities/ParseOffer";
import { parseOrder } from "../../Database/Sado/Utilities/ParseOrder";
import { log } from "../../Libraries/Log";
import { SADO_DATA } from "../../Paths";
import { RawTransaction, rpc } from "../../Services/Bitcoin";
import { getAddressessFromVout } from "../../Utilities/Address";
import { readDir, readFile, removeFile } from "../../Utilities/Files";
import { SadoEntry } from "../../Utilities/Sado";

export async function parse() {
  const blocks = await readDir(SADO_DATA);
  if (blocks.length === 0) {
    return log("\n   💤 All sado items has been processed");
  }

  log(`\n   🛒 processing ${blocks.length} items`);

  for (const block of blocks) {
    await parseBlock(block);
  }
}

export async function parseBlock(block: string) {
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
    log(`\n   📥 Processing order ${cid}`);
    const tx = await rpc.transactions.getRawTransaction(txid, true);
    if (tx === undefined) {
      continue;
    }
    await db.sado.events.insertOne({
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
    log(`\n   📤 Processing offer ${cid}`);
    const tx = await rpc.transactions.getRawTransaction(txid, true);
    if (tx === undefined) {
      continue;
    }
    await db.sado.events.insertOne({
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

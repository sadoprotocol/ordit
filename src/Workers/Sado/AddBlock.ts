import { SADO_DATA } from "../../Paths";
import { Block, RawTransaction, Transactions } from "../../Services/Bitcoin";
import { writeFile } from "../../Utilities/Files";
import { setBlockHeight } from "./Status";

export async function addBlock(block: Block & Transactions) {
  const orders: SadoEntry[] = [];
  const offers: SadoEntry[] = [];

  const txs = getSadoTransactions(block.tx);
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
      })
    );
  }

  await setBlockHeight(block.height);
}

function getSadoTransactions(txs: RawTransaction[]): SadoTransaction[] {
  const sadoTxs: SadoTransaction[] = [];
  for (const tx of txs) {
    for (const vout of tx.vout) {
      const utf8 = getNullData(vout.scriptPubKey.asm);
      if (utf8 === undefined) {
        continue;
      }
      const sado = parseSadoOutput(utf8);
      if (sado === undefined) {
        continue;
      }
      sadoTxs.push({ type: sado.type, cid: sado.cid, txid: tx.txid });
    }
  }
  return sadoTxs;
}

function getNullData(asm: string): string | undefined {
  if (asm.includes("OP_RETURN")) {
    return Buffer.from(asm.replace("OP_RETURN", "").trim(), "hex").toString();
  }
}

function parseSadoOutput(utf8?: string): Omit<SadoTransaction, "txid"> | undefined {
  if (utf8?.includes("sado=") === true) {
    const vs = utf8.split("=");
    const [type, cid] = vs[1].split(":");
    if (type === "order" || type === "offer" || type === "collection") {
      return { type, cid };
    }
  }
}

export type SadoEntry = Omit<SadoTransaction, "type">;

type SadoTransaction = {
  type: SadoType;
  cid: string;
  txid: string;
};

type SadoType = "order" | "offer" | "collection";

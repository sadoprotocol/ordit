import { config } from "../../Config";
import { db } from "../../Database";
import { rpc } from "../../Services/Bitcoin";

export async function getReorgHeight(): Promise<number> {
  const heighestBlock = await db.outputs.getHeighestBlock();

  let targetHeight = heighestBlock - config.reorg.scanLength;
  let reorgHeight = -1;

  let currentHeight = heighestBlock;
  while (currentHeight > targetHeight) {
    logProgress(currentHeight, targetHeight, reorgHeight);

    const block = await rpc.blockchain.getBlock(currentHeight);
    if (block === undefined) {
      currentHeight -= 1;
      continue;
    }

    const output = await db.outputs.findOne({ "vout.block.height": currentHeight });
    if (output === undefined) {
      if (block.nTx !== 0) {
        reorgHeight = currentHeight;
      }
      currentHeight -= 1;
      continue;
    }

    if (block.hash !== output.vout.block.hash) {
      reorgHeight = currentHeight;
      if (currentHeight === targetHeight) {
        targetHeight -= 10;
      }
      currentHeight -= 1;
      continue;
    }

    currentHeight -= 1;
  }

  return reorgHeight;
}

function logProgress(currentHeight: number, targetHeight: number, reorgHeight: number) {
  if (config.reorg.debug === true) {
    process.stdout.write(
      `\r  scanning block ${currentHeight} | ${
        currentHeight - targetHeight
      } blocks left to scan | reorg height: ${reorgHeight}          `
    );
  }
}

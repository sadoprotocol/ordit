import { db } from "~Database";
import { log } from "~Libraries/Log";
import { blockchain } from "~Services/Bitcoin";

async function main() {
  const height = await db.indexer.getHeight();

  const missingBlocks = [];
  const mismatchedBlocks = [];

  for (let i = 0; i < height; i++) {
    const output = await db.outputs.findOne({ "vout.block.height": i });
    if (output === undefined) {
      missingBlocks.push(i);
      log(`Block ${i} missing from db`);
      continue;
    }

    const dbBlockHash = output?.vout.block.hash;

    const chainBlockHash = await blockchain.getBlockHash(i);

    if (dbBlockHash !== chainBlockHash) {
      mismatchedBlocks.push(i);
      log(`Block ${i} hash mismatch`);
    }
  }
  log(`Missing blocks: ${missingBlocks.length}`);
  log(`Missing Block Numbers: ${missingBlocks.join(", ")}`);

  log(`Mismatched blocks: ${mismatchedBlocks.length}`);
  log(`Mismatched Block Numbers: ${mismatchedBlocks.join(", ")}`);
}

main();

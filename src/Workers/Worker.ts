import { bootstrap } from "../Bootstrap";
import { db } from "../Database";
import { rpc } from "../Services/Bitcoin";
import { index } from "./Index";

let lastIndexedBlock = 0;

(async () => {
  lastIndexedBlock = await db.outputs.getHeighestBlock();
  await bootstrap();
  checkForBlock();
})();

async function checkForBlock() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  if (lastIndexedBlock < blockHeight) {
    lastIndexedBlock = (await index()) ?? blockHeight;
  }
  setTimeout(checkForBlock, 5000);
}

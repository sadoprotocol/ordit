import debug from "debug";

import { config } from "../../Config";
import { ORD_DATA_SNAPSHOT, ORD_DATA_SNAPSHOTS } from "../../Paths";
import { rpc } from "../../Services/Bitcoin";
import { ord } from "../../Services/Ord";
import { copyFile, fileExists, readDir, removeFile, writeFile } from "../../Utilities/Files";
import { getIndexPath } from "./Utilities";

const log = debug("ord-snapshot");

main()
  .then(() => process.exit(0))
  .catch(console.log);

async function main() {
  log("ord snapshot started");

  const isRunning = await fileExists(`${ORD_DATA_SNAPSHOT}/lock`);
  if (isRunning === true) {
    log("ord snapshot process is running, exiting");
    return;
  }

  await writeFile(`${ORD_DATA_SNAPSHOT}/lock`, "");

  await index();
  await snapshot();

  const snapshots = (await readDir(ORD_DATA_SNAPSHOTS)).reverse().slice(config.ord.maxSnapshots);
  for (const snapshot of snapshots) {
    await removeFile(`${ORD_DATA_SNAPSHOTS}/${snapshot}`);
  }

  await removeFile(`${ORD_DATA_SNAPSHOT}/lock`);

  log("ord snapshot resolved");
}

async function index() {
  log("indexing snapshot");
  await ord.index(ORD_DATA_SNAPSHOT);
}

async function snapshot() {
  const blockHeight = await rpc.blockchain.getBlockCount();
  log("storing snapshot at height: %d", blockHeight);
  await copyFile(getIndexPath(ORD_DATA_SNAPSHOT), `${ORD_DATA_SNAPSHOTS}/${blockHeight}`);
}

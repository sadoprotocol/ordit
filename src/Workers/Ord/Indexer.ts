import debug from "debug";

import { ORD_DATA, ORD_DATA_BLUE, ORD_DATA_GREEN, ORD_DATA_SNAPSHOT, ORD_DATA_SNAPSHOTS } from "../../Paths";
import { cli } from "../../Services/Cli";
import { ord } from "../../Services/Ord";
import { copyFile, readDir, removeFile, writeFile } from "../../Utilities/Files";
import { getStatus, State } from "./Status";
import { getIndexPath } from "./Utilities";

const log = debug("ord-indexer");

const hardlink = getIndexPath(ORD_DATA);
const paths = {
  green: {
    dir: ORD_DATA_GREEN,
    index: getIndexPath(ORD_DATA_GREEN),
  },
  blue: {
    dir: ORD_DATA_BLUE,
    index: getIndexPath(ORD_DATA_BLUE),
  },
  snapshot: {
    dir: ORD_DATA_SNAPSHOT,
    index: getIndexPath(ORD_DATA_SNAPSHOT),
  },
} as const;

main();

async function main() {
  log("starting ord indexer");

  const status = await getStatus();
  if (status.running === true) {
    return log("currently indexing: %s", status.current);
  }

  const reorging = await ord.reorg();
  if (reorging === true) {
    return await reorg();
  }

  await index("green");
  await index("blue");

  log("done");
}

/**
 * Perform swith'a'roo indexing on bot the green and blue index.
 *
 * @param state - State to index.
 */
async function index(state: State) {
  log("indexing: %s", state);

  const target = paths[state];
  const sibling = paths[state === "green" ? "blue" : "green"];

  await cli.rm(hardlink);
  await cli.ln(sibling.index, hardlink);

  await writeFile(`${target.dir}/lock`, "");
  await ord.index(target.dir);
  await removeFile(`${target.dir}/lock`);
}

/**
 * Handle re-org events.
 */
async function reorg() {
  log("reorg detected, recovering from snapshot");

  // ### Hardlinking Green Index
  // We serve green index while we are recovering from snapshot to prevent service downtimes.

  await writeFile(`${paths.green.dir}/lock`, "");
  await cli.rm(hardlink);
  await cli.ln(paths.green.index, hardlink);

  // ### Remove Stale Indexes

  await cli.rm(paths.blue.index);
  await cli.rm(paths.snapshot.index);

  // ### Find Snapshot

  log("finding suitable snapshot");

  const snapshots = (await readDir(ORD_DATA_SNAPSHOTS)).reverse();
  for (const snapshot of snapshots) {
    await cli.ln(`${ORD_DATA_SNAPSHOTS}/${snapshot}`, paths.snapshot.index);
    const isReorged = await ord.reorg(ORD_DATA_SNAPSHOT);
    if (isReorged === false) {
      return recoverFromSnapshot(snapshot);
    } else {
      log("snapshot %s is stale, deleting", snapshot);
      await cli.rm(`${ORD_DATA_SNAPSHOTS}/${snapshot}`);
    }
  }

  log("no suitable snapshot found, rebuilding from epoch");
  return rebuild();
}

/**
 * Recover from the given snapshot id.
 *
 * Make sure to confirm the validity of the snapshot before passing it to this
 * method or you will end up in another re-org state.
 *
 * @param snapshot - Recoverable snapshot id.
 */
async function recoverFromSnapshot(snapshot: string) {
  log("recovering from snapshot: %s", snapshot);
  await copyFile(`${ORD_DATA_SNAPSHOTS}/${snapshot}`, paths.snapshot.index);
  await rebuild();
  log("done");
}

/**
 * Rebuild the snapshot from the current recovered state.
 */
async function rebuild() {
  await writeFile(`${ORD_DATA_SNAPSHOT}/lock`, "");

  await indexSnapshot();

  await recoverBlue();
  await recoverGreen();

  await removeFile(`${ORD_DATA_SNAPSHOT}/lock`);
}

/**
 * Run ord indexer over the current snapshot.
 */
async function indexSnapshot() {
  log("indexing snapshot");
  await ord.index(ORD_DATA_SNAPSHOT);
}

/**
 * Recover blue from snapshot.
 *
 * Once our new snapshot is back up to latest we move it to the blue index and set it
 * as the new hardlink.
 */
async function recoverBlue() {
  log("recovering blue");
  await copyFile(paths.snapshot.index, paths.blue.index);
  await cli.rm(hardlink);
  await cli.ln(paths.blue.index, hardlink);
}

/**
 * Recover green from snapshot.
 *
 * Remove the stale green index and set the blue index as the new green index.
 */
async function recoverGreen() {
  log("recovering green");
  await cli.rm(paths.green.index);
  await copyFile(paths.snapshot.index, paths.green.index);
  await removeFile(`${paths.green.dir}/lock`);
}

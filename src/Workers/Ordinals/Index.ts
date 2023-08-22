import debug from "debug";

import { ord } from "../../Services/Ord/Cli";
import { getStatus, setIndexingStatus } from "./Status";

const log = debug("ord-indexer");

export async function index(): Promise<void> {
  const status = await getStatus();
  if (status.running === true) {
    return log("indexer is running");
  }
  log("starting ord indexer");
  await setIndexingStatus(true);
  await ord.index();
  await setIndexingStatus(false);
  log("ord indexer completed");
}

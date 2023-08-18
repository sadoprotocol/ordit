import debug from "debug";

import { config } from "../../Config";
import { ORD_DATA, ORD_DATA_BLUE, ORD_DATA_GREEN, ORD_DATA_SNAPSHOT } from "../../Paths";
import { cli } from "../../Services/Cli";
import { bitcoinArgs } from "../../Services/Ord";
import { removeFile, writeFile } from "../../Utilities/Files";
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

export async function crawl(): Promise<void> {
  const status = await getStatus();
  if (status.running === true) {
    return log("currently indexing: %s", status.current);
  }
  await index("green");
  await index("blue");
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
  await indexOrd(target.dir);
  await removeFile(`${target.dir}/lock`);
}

async function indexOrd(dataDir: string): Promise<void> {
  await cli.run(config.ord.bin, [...bitcoinArgs, `--data-dir=${dataDir}`, "--index-sats", "index", "run"]);
}

import debug from "debug";

import { config } from "../Config";
import { ORD_DATA, ORD_DATA_BLUE, ORD_DATA_GREEN, ORD_DATA_SNAPSHOT } from "../Paths";
import { cli } from "../Services/Cli";
import { bitcoinArgs } from "../Services/Ord";
import { copyFile } from "../Utilities/Files";
import { getIndexPath } from "./Ord/Utilities";

const log = debug("ordit-setup");

const hardlink = getIndexPath(ORD_DATA);

main();

async function main() {
  log("setting up ordit, this will take a while ...");

  await cli.inherit(config.ord, [...bitcoinArgs, `--data-dir=${ORD_DATA_SNAPSHOT}`, "--index-sats", "index", "run"]);

  log("creating blue state");
  await copyFile(getIndexPath(ORD_DATA_SNAPSHOT), getIndexPath(ORD_DATA_BLUE));

  log("creating green state");
  await copyFile(getIndexPath(ORD_DATA_SNAPSHOT), getIndexPath(ORD_DATA_GREEN));

  log("linking blue to system index");
  await cli.rm(hardlink);
  await cli.ln(getIndexPath(ORD_DATA_BLUE), hardlink);

  log("setup done, you can now start the ordit service");
}

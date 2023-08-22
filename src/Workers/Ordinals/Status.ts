import { ORD_DATA, ORD_DATA_SNAPSHOTS } from "../../Paths";
import { fileExists, readDir, removeFile, writeFile } from "../../Utilities/Files";

export async function getStatus(): Promise<Status> {
  return {
    running: await getRunningState(),
    backups: await readDir(ORD_DATA_SNAPSHOTS),
  };
}

export async function setIndexingStatus(indexing: boolean): Promise<void> {
  if (indexing === true) {
    return writeFile(`${ORD_DATA}/lock`, "");
  }
  return removeFile(`${ORD_DATA}/lock`);
}

async function getRunningState(): Promise<boolean> {
  if (await fileExists(`${ORD_DATA}/lock`)) {
    return true;
  }
  return false;
}

type Status = {
  running: boolean;
  backups: string[];
};

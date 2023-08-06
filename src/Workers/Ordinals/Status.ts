import { ORD_DATA_BLUE, ORD_DATA_GREEN } from "../../Paths";
import { fileExists } from "../../Utilities/Files";

export async function getStatus(): Promise<Status> {
  const running = await getRunningState();
  return {
    running: running !== undefined,
    current: running,
  };
}

async function getRunningState(): Promise<State | undefined> {
  if (await fileExists(`${ORD_DATA_GREEN}/lock`)) {
    return "green";
  }
  if (await fileExists(`${ORD_DATA_BLUE}/lock`)) {
    return "blue";
  }
}

type Status = {
  running: boolean;
  current?: State;
};

export type State = "green" | "blue";

import { config } from "../../Config";
import { DATA_DIR } from "../../Paths";
import { readFile, writeFile } from "../../Utilities/Files";

export async function setBlockHeight(value: number | string) {
  await writeFile(`${DATA_DIR}/sado_n`, typeof value === "string" ? value : JSON.stringify(value));
}

export async function getBlockHeight() {
  const data = await readFile(`${DATA_DIR}/sado_n`);
  if (data === undefined) {
    return config.sado.startBlock;
  }
  const height = parseInt(data);
  if (isNaN(height)) {
    return config.sado.startBlock;
  }
  return height;
}

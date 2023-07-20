import { DATA_DIR } from "../../Paths";
import { readFile, writeFile } from "../../Utilities/Files";

const filename = `${DATA_DIR}/spent_block_n`;

export async function blockHeight(number?: number): Promise<number> {
  if (number === undefined) {
    const data = await readFile(filename);
    number = data !== undefined ? parseInt(data) : 0;
  }
  await writeFile(filename, JSON.stringify(number));
  return number;
}

export async function getBlockHeight(): Promise<number> {
  const data = await readFile(filename);
  if (data === undefined) {
    return 0;
  }
  return parseInt(data);
}

import { mkdirSync, promises } from "node:fs";

import { DIR_DATA } from "../../Paths";

const fs = promises;

mkdirSync(DIR_DATA, { recursive: true });

export async function blockHeight(number?: number): Promise<number> {
  const filename = "block_n";
  if (number === undefined) {
    const data = await readFile(filename);
    number = data !== undefined ? parseInt(data) : 0;
  }
  await writeFile(filename, number);
  return number;
}

async function readFile(filename: string): Promise<string | undefined> {
  try {
    const data = await fs.readFile(`${DIR_DATA}/${filename}`, "binary");
    return Buffer.from(data).toString();
  } catch (_) {
    return undefined;
  }
}

async function writeFile(filename: string, number: number) {
  await fs.writeFile(`${DIR_DATA}/${filename}`, JSON.stringify(number));
}

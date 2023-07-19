import { promises } from "node:fs";
import { Stream } from "node:stream";

export const fs = promises;

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

export async function writeFile(file: string, data: FileData): Promise<void> {
  await fs.writeFile(file, data);
}

export async function copyFile(source: string, target: string): Promise<void> {
  await fs.copyFile(source, target);
}

export async function readDir(dir: string): Promise<string[]> {
  try {
    return fs.readdir(dir);
  } catch (_) {
    return [];
  }
}

export async function readFile(file: string): Promise<string | undefined> {
  try {
    const data = await fs.readFile(file, "binary");
    return Buffer.from(data).toString();
  } catch (_) {
    return undefined;
  }
}

export async function removeFile(file: string): Promise<void> {
  await fs.unlink(file);
}

type FileData =
  | string
  | NodeJS.ArrayBufferView
  | Iterable<string | NodeJS.ArrayBufferView>
  | AsyncIterable<string | NodeJS.ArrayBufferView>
  | Stream;

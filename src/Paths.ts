import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const DIR_ROOT = resolve(__dirname, "..");
export const DATA_DIR = resolve(DIR_ROOT, ".data");
export const SRC_DIR = resolve(DIR_ROOT, "src");

export const METHODS_DIR = resolve(SRC_DIR, "Methods");

// ### Ensure Paths Exists

mkdirSync(DATA_DIR, { recursive: true });

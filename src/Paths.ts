import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const DIR_ROOT = resolve(__dirname, "..");
export const DATA_DIR = resolve(DIR_ROOT, ".data");
export const SRC_DIR = resolve(DIR_ROOT, "src");

export const METHODS_DIR = resolve(SRC_DIR, "Methods");

export const SPENTS_DATA = resolve(DATA_DIR, "spents");
export const SADO_DATA = resolve(DATA_DIR, "sado");

// ### Ensure Paths Exists

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(SPENTS_DATA, { recursive: true });
mkdirSync(SADO_DATA, { recursive: true });

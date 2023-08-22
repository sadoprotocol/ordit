import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { getNetworkPath } from "./Workers/Ordinals/Utilities";

export const DIR_ROOT = resolve(__dirname, "..");
export const DATA_DIR = resolve(DIR_ROOT, ".data");

export const SPENTS_DATA = resolve(DATA_DIR, "spents");
export const SADO_DATA = resolve(DATA_DIR, "sado");

export const ORD_DATA = resolve(DATA_DIR, "ord");
export const ORD_DATA_SNAPSHOTS = resolve(ORD_DATA, "snapshots");

// ### Ensure Paths Exists

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(SPENTS_DATA, { recursive: true });
mkdirSync(SADO_DATA, { recursive: true });
mkdirSync(getNetworkPath(ORD_DATA), { recursive: true });
mkdirSync(ORD_DATA_SNAPSHOTS, { recursive: true });

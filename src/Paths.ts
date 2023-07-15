import { resolve } from "node:path";

export const DIR_ROOT = resolve(__dirname, "..");

// ### Binary Paths

export const DIR_BIN = resolve(DIR_ROOT, "bin");
export const DIR_ORD_BIN = resolve(DIR_BIN, "ord");

// ### Bitcoin Core Paths

export const BTC_DATA = resolve(DIR_ROOT, ".bitcoin");

// ### Data Paths

export const DIR_DATA = resolve(DIR_ROOT, ".data");

// ### ORD Paths

export const ORD_DATA = resolve(DIR_DATA, "ord");
export const ORD_DATA_ONE = resolve(ORD_DATA, "one");
export const ORD_DATA_TWO = resolve(ORD_DATA, "two");

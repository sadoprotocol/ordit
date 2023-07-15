import * as dotenv from "dotenv";

dotenv.config();

/**
 * Get an environment variable and parse it to the desired type.
 *
 * @param key   - Environment key to resolve.
 * @param parse - Parser function to convert the value to the desired type. Default: `string`.
 */
export function getEnvironmentVariable(key: string, optional?: boolean): string;
export function getEnvironmentVariable<T extends EnvParser>(key: string, parse: T, optional?: boolean): ReturnType<T>;
export function getEnvironmentVariable<T extends EnvParser>(key: string, parse?: T, optional?: boolean): ReturnType<T> {
  const value = process.env[key];
  if (typeof parse === "boolean") {
    optional = parse;
    parse = undefined;
  }
  if (value === undefined && optional !== true) {
    throw new Error(`Config Exception: Missing ${key} variable in configuration`);
  }
  return parse ? parse(value) : envToString(value);
}

/**
 * Convert an environment variable to a string.
 *
 * @param value - Value to convert.
 */
export function envToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  throw new Error(`Config Exception: Cannot convert ${value} to string`);
}

/**
 * Convert an environment variable to a number.
 *
 * @param value - Value to convert.
 */
export function envToNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return parseInt(value);
  }
  throw new Error(`Config Exception: Cannot convert ${value} to number`);
}

/**
 * Convert an environment variable to a boolean.
 *
 * @param value - Value to convert.
 */
export function envToBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  throw new Error(`Config Exception: Cannot convert ${value} to boolean`);
}

type EnvParser = (value: unknown) => any;

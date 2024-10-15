import { Long } from "bson";

export async function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export function convertStringToBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "string") {
    // Check if the string represents a large integer and convert it to BigInt
    if (!isNaN(Number(obj)) && /^-?\d+$/.test(obj)) {
      try {
        return BigInt(obj);
      } catch (e) {
        return obj;
      }
    }
  }

  if (typeof obj === "bigint") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertStringToBigInt);
  }

  if (typeof obj === "object") {
    // Check if the object is a BSON Long
    if (Long.isLong(obj)) {
      return obj.toBigInt();
    }

    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = convertStringToBigInt(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

export function convertBigIntToString(obj: any, seen = new WeakSet()): any {
  if (obj && typeof obj === "object") {
    if (seen.has(obj)) return obj; // Return the object as-is if already processed

    seen.add(obj);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        if (typeof value === "bigint") {
          obj[key] = value.toString();
        } else if (typeof value === "object" && value !== null) {
          convertBigIntToString(value, seen);
        }
      }
    }
  } else if (Array.isArray(obj)) {
    return obj.map((item) => convertBigIntToString(item, seen));
  }

  return obj;
}

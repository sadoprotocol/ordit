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

  if (Array.isArray(obj)) {
    return obj.map(convertStringToBigInt);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-next-line no-prototype-builtins
        newObj[key] = convertStringToBigInt(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

export function convertBigIntToString(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(key)) {
        // eslint-disable-next-line no-prototype-builtins
        newObj[key] = convertBigIntToString(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

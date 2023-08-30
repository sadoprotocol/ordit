import { parseLocation } from "./Transaction";

export function getIdFromOutpoint(outpoint: string) {
  return outpoint.replace(":", "i");
}

export function getLocationFromId(id: string) {
  return parseLocation(getOutpointFromId(id));
}

export function getOutpointFromId(id: string) {
  const outpoint = id.split("");
  outpoint[id.length - 2] = ":";
  return outpoint.join("");
}

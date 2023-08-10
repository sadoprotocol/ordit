export function getIdFromOutpoint(outpoint: string) {
  return outpoint.replace(":", "");
}

export function getOutpointFromId(id: string) {
  return id
    .split("")
    .map((x, i, arr) => (i === arr.length - 2 ? ":" : x))
    .join("");
}

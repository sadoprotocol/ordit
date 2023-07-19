export function getIdFromOutpoint(outpoint: string) {
  return outpoint.replace(":", "");
}

export function getOutpointFromId(id: string) {
  const outpoint = id.split("");
  outpoint[id.length - 2] = ":";
  return outpoint.join("");
}

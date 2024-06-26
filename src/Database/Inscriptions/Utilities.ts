export function getIdFromOutpoint(outpoint: string) {
  return outpoint.replace(":", "i");
}

export function getOutpointFromId(id: string) {
  const outpoint = id.split("");
  // Replace 65th character (i) with a colon (:)
  outpoint[64] = ":";
  return outpoint.join("");
}

import { OutputDocument } from "./Collection";

export function getHeighestOutput(output: OutputDocument): OutputDocument["vout"] {
  const { vin, vout } = output;

  if (vin === undefined) return vout;

  return vin.block.height > vout.block.height ? vin : vout;
}

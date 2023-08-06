import { OutputDocument } from "./Collection";

export function getHeighestOutput(output: OutputDocument): OutputDocument["vout"] {
  if (output.vin !== undefined && output.vin.block.height > output.vout.block.height) {
    return output.vin;
  }
  return output.vout;
}

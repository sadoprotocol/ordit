import { Filter } from "mongodb";

import { OutputDocument } from "./Collection";

export const noSpentsFilter: Filter<OutputDocument> = {
  spent: { $ne: true },
  $or: [{ vin: { $exists: false } }],
};

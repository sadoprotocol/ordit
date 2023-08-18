import { Filter } from "mongodb";

import { OutputDocument } from "./Collection";

export const noVinFilter: Filter<OutputDocument> = {
  spent: { $ne: true },
  $or: [{ vin: { $exists: false } }, { vin: null }],
};

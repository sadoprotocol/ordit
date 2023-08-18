import { Filter } from "mongodb";

import { OutputDocument } from "./Collection";

export const noVinFilter: Filter<OutputDocument> = {
  $or: [{ vin: { $exists: false } }, { vin: null }],
};

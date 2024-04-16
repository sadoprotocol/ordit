import { getOutpointFromId } from "~Database/Inscriptions/Utilities";

import { parseLocation } from "../../Utilities/Transaction";

export function getLocationFromId(id: string) {
  return parseLocation(getOutpointFromId(id));
}

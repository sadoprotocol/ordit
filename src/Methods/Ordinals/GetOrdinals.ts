import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { ord } from "../../Services/Ord";

export default method({
  params: Schema({
    location: string,
  }),
  handler: async ({ location }) => {
    return ord.getOrdinals(location);
  },
});

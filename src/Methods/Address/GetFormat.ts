import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getAddressFormat } from "../../Utilities/Address";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    return getAddressFormat(address);
  },
});

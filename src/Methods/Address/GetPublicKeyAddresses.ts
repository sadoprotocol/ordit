import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { getAddressesFromPublicKey } from "../../Utilities/Address";

export default method({
  params: Schema({
    publicKey: string,
  }),
  handler: async ({ publicKey }) => {
    return getAddressesFromPublicKey(publicKey);
  },
});

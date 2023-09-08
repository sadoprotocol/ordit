import { method } from "@valkyr/api";
import Schema, { string } from "computed-types";

import { AddressFormats, addressNameToType, getAddressFormat } from "../../Utilities/Address";

export default method({
  params: Schema({
    address: string,
  }),
  handler: async ({ address }) => {
    const addressFormat = getAddressFormat(address).format;
    return addressNameToType[addressFormat as AddressFormats];
  },
});

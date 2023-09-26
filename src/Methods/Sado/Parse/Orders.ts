import { method } from "@valkyr/api";

import { resolve } from "../../../Workers/Sado/Resolve";

export default method({
  handler: async () => {
    return resolve();
  },
});

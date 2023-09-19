import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";

export default method({
  handler: async () => {
    return fetch(`http://${config.parser.host}:${config.parser.port}/health`);
  },
});

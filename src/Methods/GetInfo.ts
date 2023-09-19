import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";

export default method({
  handler: async () => {
    const response = await fetch(`http://${config.worker.host}:${config.worker.port}/health`);
    if (response.status !== 200) {
      return {
        status: "down",
      };
    }
    return response;
  },
});

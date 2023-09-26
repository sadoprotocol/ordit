import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";

export default method({
  handler: async () => {
    return fetch(`http://${config.worker.host}:${config.worker.port}/health`)
      .then((response) => response.json())
      .catch(() => {
        return {
          status: "down",
        };
      });
  },
});

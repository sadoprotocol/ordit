import { method } from "@valkyr/api";
import fetch from "node-fetch";

import { config } from "../Config";

const id = getRandomString();

export default method({
  handler: async () => {
    return fetch(`http://${config.worker.host}:${config.worker.port}/health`)
      .then(async (response) => ({
        id,
        ...((await response.json()) as any),
      }))
      .catch(() => {
        return {
          status: "down",
        };
      });
  },
});

function getRandomString(length = 10) {
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length })
    .map(() => characters[Math.floor(Math.random() * characters.length)])
    .join("");
}

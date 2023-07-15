import { promises } from "node:fs";

import { DIR_DATA } from "../Paths";
import { mongo } from "./Mongo";

const fs = promises;

let interval: NodeJS.Timeout | undefined;

export const profiler = {
  start,
  stop,
};

/**
 * Start the profiler and log out a profiling result every `timer` seconds.
 *
 * @param level - Profiling level to use. _Default: "slow_only"_
 * @param timer - Time in seconds between each profiling result.
 */
function start(level: "slow_only" | "all" = "slow_only", timer = 10) {
  mongo.db.setProfilingLevel(level);
  interval = setInterval(() => {
    mongo
      .collection("system.profile")
      .find()
      .toArray()
      .then((profiles) => {
        fs.writeFile(`${DIR_DATA}/profile`, JSON.stringify(profiles, null, 2));
      });
  }, timer * 1000);
}

/**
 * Stop the profiler and clear the interval.
 */
function stop() {
  mongo.db.setProfilingLevel("off");
  if (interval) {
    clearInterval(interval);
  }
}

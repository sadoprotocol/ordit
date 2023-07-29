import neo4j from "neo4j-driver";

import { config } from "../Config";

export const neo = neo4j.driver(
  `bolt://${config.neo.hostname}:${config.neo.port}`,
  neo4j.auth.basic(config.neo.user, config.neo.pass)
);

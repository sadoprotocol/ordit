import { Redis } from "ioredis";

import { config } from "../Config";

export const redis = new Redis(config.redis.port, config.redis.hostname);

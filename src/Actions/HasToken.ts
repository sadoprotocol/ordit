import { Action, UnauthorizedError } from "@valkyr/api";

import { config } from "../Config";

export const hasToken: Action = async (ctx, res) => {
  const authorization = ctx.headers?.authorization;
  if (authorization === undefined || authorization !== `Bearer ${config.api.token}`) {
    return res.reject(new UnauthorizedError());
  }
  return res.accept();
};

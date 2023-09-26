import { Action, UnauthorizedError } from "@valkyr/api";

import { config } from "../Config";

export const hasFaucetBearer: Action = async (ctx, res) => {
  const authorization = ctx.headers?.authorization;
  if (authorization === undefined || authorization !== config.faucet.auth) {
    return res.reject(new UnauthorizedError());
  }
  return res.accept();
};

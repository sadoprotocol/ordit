import { blockchain } from "./Blockchain";
import { generating } from "./Generating";
import { transactions } from "./Transactions";
import { util } from "./Util";

export * from "./Blockchain";
export { optional, RpcError } from "./Rpc";
export * from "./Transactions";
export * from "./Util";

export const rpc = {
  blockchain,
  generating,
  transactions,
  util,
};

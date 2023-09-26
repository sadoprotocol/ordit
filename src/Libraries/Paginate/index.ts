import { aggregatePaginated } from "./AggregatePaginated";
import { findPaginated } from "./FindPaginated";

export type { AggregatePaginatedParams, AggregatePaginatedResult } from "./AggregatePaginated";
export type { FindPaginatedParams, FindPaginatedResult } from "./FindPaginated";

export const paginate = {
  aggregatePaginated,
  findPaginated,
};

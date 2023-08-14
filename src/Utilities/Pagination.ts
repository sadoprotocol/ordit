import Schema, { number, Type } from "computed-types";

export const pagination = Schema({
  page: number.gt(0).optional(),
  limit: number.optional(),
});

export function getPagination({ page = 1, limit = 10 }: Pagination = {}): {
  skip: number;
  limit: number;
} {
  return {
    skip: (page - 1) * limit,
    limit,
  };
}

export type Pagination = Type<typeof pagination>;

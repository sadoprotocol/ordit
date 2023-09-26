import base64Url from "base64-url";
import { EJSON } from "bson";
import get from "lodash.get";
import mapValues from "lodash.mapvalues";
import { Filter } from "mongodb";

import { CursorObject, Sort, SortDirection } from "./Types";

export const buildCursor = <T>(document: T, sort: Sort): CursorObject => {
  return Object.keys(sort).reduce((acc, key) => {
    acc[key] = get(document, key);
    return acc;
  }, {} as CursorObject);
};

export const urlSafeCursor = (cursor: string) => {
  let encoded = cursor.replace(/-/g, "+").replace(/_/g, "/");
  while (encoded.length % 4) encoded += "=";
  return encoded;
};

export const unWrapCursor = (cursor: string) => {
  return cursor.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const encodeCursor = (cursorObject: CursorObject): string => {
  return urlSafeCursor(base64Url.encode(EJSON.stringify(cursorObject)));
};

export const decodeCursor = (cursorString: string): CursorObject => {
  return EJSON.parse(base64Url.decode(unWrapCursor(cursorString))) as CursorObject;
};

export const buildQueryFromCursor = <T>(sort: Sort, cursor: CursorObject): Filter<T> => {
  // Consider the `cursor`:
  // { createdAt: '2020-03-22', color: 'blue', _id: 4 }
  //
  // And the `sort`:
  // { createdAt: 1, color: -1 }
  //
  // The following table represents our documents (already sorted):
  // ┌────────────┬───────┬─────┐
  // │  createdAt │ color │ _id │
  // ├────────────┼───────┼─────┤
  // │ 2020-03-20 │ green │   1 │ <--- Line 1
  // │ 2020-03-21 │ green │   2 │ <--- Line 2
  // │ 2020-03-22 │ green │   3 │ <--- Line 3
  // │ 2020-03-22 │ blue  │   4 │ <--- Line 4 (our cursor points to here)
  // │ 2020-03-22 │ blue  │   5 │ <--- Line 5
  // │ 2020-03-22 │ amber │   6 │ <--- Line 6
  // │ 2020-03-23 │ green │   7 │ <--- Line 7
  // │ 2020-03-23 │ green │   8 │ <--- Line 8
  // └────────────┴───────┴─────┘
  //
  // In that case, in order to get documents starting after our cursor, we need
  // to make sure any of the following clauses is true:
  // - { createdAt: { $gt: '2020-03-22' } }                                          <--- Lines: 7 and 8
  // - { createdAt: { $eq: '2020-03-22' }, color: { $lt: 'blue' } }                  <--- Lines: 6
  // - { createdAt: { $eq: '2020-03-22' }, color: { $eq: 'blue' }, _id: { $gt: 4 } } <--- Lines: 5
  const cursorEntries = Object.entries(cursor);

  // So here we build an array of the OR clauses as mentioned above
  const clauses = cursorEntries.reduce((clauses, [outerKey], index) => {
    const currentCursorEntries = cursorEntries.slice(0, index + 1);

    const clause = currentCursorEntries.reduce((clause, [key, value]) => {
      // Last item in the clause uses an inequality operator
      if (key === outerKey) {
        const sortOrder = sort[key] ?? 1;
        const operator = typeof sortOrder === "number" && sortOrder < 0 ? "$lt" : "$gt";
        clause[key] = { [operator]: value };
        return clause;
      }

      // The rest use the equality operator
      clause[key] = { $eq: value };
      return clause;
    }, {} as Filter<any>);

    clauses.push(clause);
    return clauses;
  }, [] as Filter<any>[]);

  return { $or: clauses };
};

export const normalizeDirectionParams = ({
  limit,
  prev,
  next,
  sort = {},
}: {
  limit?: number;
  prev?: string;
  next?: string;
  sort?: Sort;
}) => {
  // In case our sort object doesn't contain the `_id`, we need to add it
  if (!("_id" in sort)) {
    sort = {
      ...sort,
      // Important that it's the last key of the object to take the least priority
      _id: 1,
    } as Sort;
  }

  if (prev !== undefined) {
    return {
      limit: limit ?? 10,
      cursor: prev ? decodeCursor(prev) : null,
      sort: mapValues(sort, (value: SortDirection) => sortDirectionToNumber(value) * -1) as unknown as Sort,
      reverse: true,
    };
  }

  return {
    limit: limit ?? 10,
    cursor: next ? decodeCursor(next) : null,
    sort: mapValues(sort, sortDirectionToNumber) as unknown as Sort,
    reverse: false,
  };
};

function sortDirectionToNumber(direction: SortDirection) {
  switch (direction) {
    case "desc":
    case "descending":
    case -1: {
      return -1;
    }
    default: {
      return 1;
    }
  }
}

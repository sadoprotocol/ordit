import { type Collection } from "mongodb";

import { BaseDocument, Sort } from "./Types";
import { buildCursor, buildQueryFromCursor, encodeCursor, normalizeDirectionParams } from "./Utilities";

export const aggregatePaginated = async <TDocument extends BaseDocument>(
  collection: Collection,
  { limit, prev, next, skip, pipeline, sort: originalSort = {} }: AggregatePaginatedParams
): Promise<AggregatePaginatedResult<TDocument>> => {
  const {
    limit: lmt,
    cursor,
    sort,
    reverse,
  } = normalizeDirectionParams({
    limit,
    prev,
    next,
    sort: originalSort,
  });

  const result = (await collection
    .aggregate([
      ...pipeline,
      // When we receive a cursor, we must make sure only results after
      // (or before) the given cursor are returned, so we need to add an
      // extra condition.
      { $match: cursor ? buildQueryFromCursor(sort, cursor) : {} },
      { $skip: skip ?? 0 },
      { $sort: sort },
      // Get 1 extra document to know if there's more after what was requested
      { $limit: lmt + 1 },
    ])
    .toArray()) as TDocument[];

  // Check whether the extra document mentioned above exists
  const extraDocument = result[lmt];
  const hasMore = Boolean(extraDocument);

  // Build an array without the extra document
  const documents = result.slice(0, lmt) as any;
  if (reverse) {
    documents.reverse();
  }

  for (const document of documents) {
    document.$cursor = encodeCursor(buildCursor(document, sort));
    delete document._id;
  }

  const hasPreviousPage = reverse ? hasMore : Boolean(next);
  const hasNextPage = reverse ? Boolean(prev) : hasMore;

  return {
    documents,
    pagination: {
      count: documents.length,
      prev: hasPreviousPage ? documents[0]?.$cursor ?? null : null,
      next: hasNextPage ? documents[documents.length - 1]?.$cursor ?? null : null,
    },
  };
};

export type AggregatePaginatedParams = {
  limit?: number;
  prev?: string;
  next?: string;
  skip?: number;
  pipeline: Array<{ [key: string]: any }>;
  sort?: Sort;
};

export type AggregatePaginatedResult<T> = {
  documents: Array<T & { $cursor: string }>;
  pagination: {
    count: number;
    prev: string | null;
    next: string | null;
  };
};

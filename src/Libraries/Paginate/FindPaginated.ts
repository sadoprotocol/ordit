import { type Collection, Document, Filter } from "mongodb";

import { Projection, Sort } from "./Types";
import { buildCursor, buildQueryFromCursor, encodeCursor, normalizeDirectionParams } from "./Utilities";

export const findPaginated = async <T extends Document>(
  collection: Collection<T>,
  {
    limit,
    prev,
    next,
    skip,
    filter = {},
    sort: originalSort = {},
    projection = {},
    transform,
    cursorInfo = true,
  }: FindPaginatedParams<T>,
): Promise<FindPaginatedResult<T>> => {
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

  const result = await collection
    .find<T>(cursor === null ? filter : { ...filter, ...buildQueryFromCursor(sort, cursor) })
    .sort(sort)
    .skip(skip ?? 0)
    .limit(lmt + 1) // Get 1 extra document to know if there's more after what was requested
    .project(projection)
    .toArray();

  // Check whether the extra document mentioned above exists
  const extraDocument = result[lmt];
  const hasMore = Boolean(extraDocument);

  // Build an array without the extra document
  const documents = result.slice(0, lmt) as any;
  if (reverse) {
    documents.reverse();
  }

  // Generate cursors for the first and last documents for pagination
  const firstDocumentCursor = encodeCursor(buildCursor(documents[0], sort));
  const lastDocumentCursor = encodeCursor(buildCursor(documents[documents.length - 1], sort));

  // Only add $cursor to the document if verbose is true
  for (const document of documents) {
    if (cursorInfo) {
      document.$cursor = encodeCursor(buildCursor(document, sort));
    }
    delete document._id;
    transform?.(document);
  }

  const hasPreviousPage = reverse ? hasMore : Boolean(next);
  const hasNextPage = reverse ? Boolean(prev) : hasMore;

  return {
    documents,
    pagination: {
      limit: documents.length,
      prev: hasPreviousPage ? firstDocumentCursor : null,
      next: hasNextPage ? lastDocumentCursor : null,
    },
  };
};

export type FindPaginatedParams<T> = {
  limit?: number;
  prev?: string;
  next?: string;
  skip?: number;
  filter?: Filter<T>;
  sort?: Sort;
  projection?: Projection;
  transform?: (document: T) => void;
  cursorInfo?: boolean;
};

export type FindPaginatedResult<T> = {
  documents: Array<T & { $cursor?: string }>;
  pagination: {
    limit: number;
    prev: string | null;
    next: string | null;
  };
};

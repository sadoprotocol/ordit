import { ObjectId } from "mongodb";

export type BaseDocument = {
  _id: ObjectId;
};

export type CursorObject = {
  [key: string]: any;
};

export type SortDirection = 1 | -1 | "asc" | "desc" | "ascending" | "descending" | { $meta: string };

export type Sort = {
  [key: string]: SortDirection;
};

export type Projection = {
  [key: string]: any;
};

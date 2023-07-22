export abstract class ResponseError extends Error {
  static Report<T extends Class>(this: T, ...args: ConstructorParameters<T>): { error: InstanceType<T> } {
    return { error: new (this as any)(...args) };
  }

  is(error: ResponseError): boolean {
    return typeof error === this.constructor.name;
  }
}

export function isError<E>(response: any): response is { error: E } {
  return response && typeof response === "object" && "error" in response;
}

export type Response<R, E> =
  | R
  | {
      error: E;
    };

type ConstructorParameters<T> = T extends new (...args: infer P) => any ? P : never;

type Class = new (...args: any[]) => any;

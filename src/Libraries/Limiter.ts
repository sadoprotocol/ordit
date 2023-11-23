import pLimit from "p-limit";

export function limiter<T>(concurrency: number) {
  const limit = pLimit(concurrency);
  const input: Promise<any>[] = [];
  return {
    push: (fn: () => Promise<T>) => {
      input.push(limit(fn));
    },
    run: async (): Promise<T[]> => {
      return await Promise.all(input);
    },
  };
}

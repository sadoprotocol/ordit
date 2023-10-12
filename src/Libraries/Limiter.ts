import pLimit from "p-limit";

export function limiter(concurrency: number) {
  const limit = pLimit(concurrency);
  const input: Promise<any>[] = [];
  return {
    push: (fn: () => Promise<any>) => {
      input.push(limit(fn));
    },
    run: async () => {
      await Promise.all(input);
    },
  };
}

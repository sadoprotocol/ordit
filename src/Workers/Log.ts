export function log(message: string): void {
  process.stdout.write(message);
}

export function perf() {
  const ts = performance.now();
  return {
    get now() {
      return ((performance.now() - ts) / 1000).toFixed(3);
    },
  };
}

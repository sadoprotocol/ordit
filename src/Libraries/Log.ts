export function log(message: string, padding = 0): void {
  const pre = [];
  for (const char of message) {
    if (char === "\n") {
      pre.push(char);
      continue;
    }
    if (char === "\r") {
      pre.push(char);
      continue;
    }
    break;
  }
  if (pre.length > 0) {
    message = message.slice(pre.length);
  }
  process.stdout.write(pre.join("") + message.padStart(message.length + padding) + "\n");
}

export function perf() {
  const ts = performance.now();
  return {
    get now() {
      return ((performance.now() - ts) / 1000).toFixed(3);
    },
  };
}

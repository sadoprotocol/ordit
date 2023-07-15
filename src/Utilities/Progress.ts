export function printProgress(prefix: string, current: number, total: number): void {
  process.stdout.write(
    `  ${prefix} ${current.toLocaleString()} / ${total.toLocaleString()} [${((current / total) * 100).toFixed(2)}%]\r`
  );
}

export function printProgress(prefix: string, current: number, total: number): void {
  process.stdout.write(
    `  ${prefix} ${current.toLocaleString()} / ${total.toLocaleString()} [${getProgressPercentage(
      current,
      total
    ).toFixed(2)}%]          \r`
  );
}

export function getProgressPercentage(current: number, total: number): number {
  return (current / total) * 100;
}

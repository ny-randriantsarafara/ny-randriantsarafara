export function readPerformanceElapsedMs(startMark: number): number {
  const elapsed = performance.now() - startMark;
  if (elapsed < 0) {
    return 0;
  }
  const rounded = Math.round(elapsed);
  if (rounded > 86_400_000) {
    return 86_400_000;
  }
  return rounded;
}

export function readPerformanceMark(): number {
  return performance.now();
}

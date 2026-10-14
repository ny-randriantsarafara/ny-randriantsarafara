export function retentionEventsCutoffIso(clock: () => Date): string {
  const now = clock();
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 13, now.getUTCDate()));
  return cutoff.toISOString();
}

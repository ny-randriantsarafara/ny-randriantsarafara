export function readReferrerHost(referrer: string | undefined): string | null {
  if (referrer === undefined || referrer.trim().length === 0) {
    return null;
  }
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

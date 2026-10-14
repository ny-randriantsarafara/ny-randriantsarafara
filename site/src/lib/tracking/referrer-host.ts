export function readReferrerHostFromDocument(referrer: string): string | undefined {
  if (referrer.trim().length === 0) {
    return undefined;
  }
  try {
    return new URL(referrer).hostname;
  } catch {
    return undefined;
  }
}

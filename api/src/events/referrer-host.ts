function readHostnameFromUrl(referrer: string): string | null {
  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

function readBareHostname(referrer: string): string | null {
  const trimmed = referrer.trim();
  if (trimmed.length === 0 || trimmed.includes('/')) {
    return null;
  }
  if (!/^[a-z0-9.-]+$/i.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function readReferrerHost(referrer: string | undefined): string | null {
  if (referrer === undefined || referrer.trim().length === 0) {
    return null;
  }
  const fromUrl = readHostnameFromUrl(referrer);
  if (fromUrl !== null) {
    return fromUrl;
  }
  return readBareHostname(referrer);
}

export function parseEventJsonFromText(raw: string): unknown {
  if (raw.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

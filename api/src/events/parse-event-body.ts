export async function parseEventBody(
  contentType: string | undefined,
  readText: () => Promise<string>
): Promise<unknown> {
  const raw = await readText();
  if (raw.trim().length === 0) {
    return null;
  }
  const normalized = contentType?.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized === 'application/json') {
    return parseJson(raw);
  }
  return parseJson(raw);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

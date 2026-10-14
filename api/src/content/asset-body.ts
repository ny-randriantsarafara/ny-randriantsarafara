export const DIRECTUS_ASSET_TIMEOUT_MS = 5_000;
export const DIRECTUS_ASSET_MAX_BYTES = 5 * 1024 * 1024;

export async function readAssetBody(
  response: Response,
  maxBytes: number = DIRECTUS_ASSET_MAX_BYTES
): Promise<ArrayBuffer | null> {
  const lengthHeader = response.headers.get('Content-Length');
  if (lengthHeader !== null) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length) && length > maxBytes) {
      return null;
    }
  }
  const reader = response.body?.getReader();
  if (reader === undefined) {
    return null;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value === undefined) {
        continue;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    await reader.cancel();
    return null;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

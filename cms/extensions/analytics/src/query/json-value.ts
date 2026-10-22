import type { JsonObject, JsonValue } from '@portfolio/cms-schema';

export function jsonValueFromUnknown(raw: unknown): JsonValue {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => jsonValueFromUnknown(entry));
  }
  if (typeof raw === 'object') {
    const object: JsonObject = {};
    for (const [key, value] of Object.entries(raw)) {
      object[key] = jsonValueFromUnknown(value);
    }
    return object;
  }
  return null;
}

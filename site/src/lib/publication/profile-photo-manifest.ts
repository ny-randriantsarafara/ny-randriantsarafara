import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type ProfilePhotoManifest = {
  src: string;
  width: number;
  height: number;
  byteLength: number;
};

function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProfilePhotoManifest(value: unknown): value is ProfilePhotoManifest {
  if (!isRecord(value)) {
    return false;
  }
  if (typeof value.src !== 'string' || value.src.length === 0) {
    return false;
  }
  if (typeof value.width !== 'number' || value.width <= 0) {
    return false;
  }
  if (typeof value.height !== 'number' || value.height <= 0) {
    return false;
  }
  if (typeof value.byteLength !== 'number' || value.byteLength < 0) {
    return false;
  }
  return true;
}

export function parseProfilePhotoManifest(json: unknown): ProfilePhotoManifest | null {
  if (!isProfilePhotoManifest(json)) {
    return null;
  }
  return json;
}

export function readProfilePhotoManifest(): ProfilePhotoManifest | null {
  const filePath = path.join(process.cwd(), 'content', 'profile-photo.manifest.json');
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = parseJson(readFileSync(filePath, 'utf8'));
  return parseProfilePhotoManifest(raw);
}

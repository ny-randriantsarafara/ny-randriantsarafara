import { createHash, timingSafeEqual } from 'node:crypto';

export function isAuthorizedHookCall(header: string | undefined, secret: string): boolean {
  if (header === undefined) {
    return false;
  }
  const match = /^Bearer\s+(\S+)\s*$/u.exec(header);
  if (match === null) {
    return false;
  }
  const token = match[1];
  if (token === undefined || token.length === 0) {
    return false;
  }
  return safeEqual(token, secret);
}

function safeEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left, 'utf8').digest();
  const rightDigest = createHash('sha256').update(right, 'utf8').digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

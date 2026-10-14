import { createHash } from 'node:crypto';

const VISITOR_HASH_HEX_LENGTH = 16;

export function hashVisitor(salt: Buffer, ipAddress: string, userAgent: string): string {
  return createHash('sha256')
    .update(salt)
    .update(ipAddress)
    .update(userAgent)
    .digest('hex')
    .slice(0, VISITOR_HASH_HEX_LENGTH);
}

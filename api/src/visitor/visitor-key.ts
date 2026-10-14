import { randomBytes } from 'node:crypto';

import { hashVisitor } from './visitor-hash.ts';

export type VisitorKeyFactory = {
  derive(ipAddress: string, userAgent: string): string;
};

export function createVisitorKeyFactory(): VisitorKeyFactory {
  const salt = randomBytes(32);
  return {
    derive(ipAddress: string, userAgent: string): string {
      return hashVisitor(salt, ipAddress, userAgent);
    },
  };
}

export function createVisitorKeyFactoryWithSalt(salt: Buffer): VisitorKeyFactory {
  return {
    derive(ipAddress: string, userAgent: string): string {
      return hashVisitor(salt, ipAddress, userAgent);
    },
  };
}

import { createHash, randomBytes } from 'node:crypto';

export type VisitorKeyFactory = {
  derive(ipAddress: string, userAgent: string): string;
};

export function createVisitorKeyFactory(): VisitorKeyFactory {
  const salt = randomBytes(32);
  return {
    derive(ipAddress: string, userAgent: string): string {
      return createHash('sha256').update(salt).update(ipAddress).update(userAgent).digest('hex');
    },
  };
}

export function createVisitorKeyFactoryWithSalt(salt: Buffer): VisitorKeyFactory {
  return {
    derive(ipAddress: string, userAgent: string): string {
      return createHash('sha256').update(salt).update(ipAddress).update(userAgent).digest('hex');
    },
  };
}

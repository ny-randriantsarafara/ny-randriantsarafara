import { hashVisitor } from './visitor-hash.ts';
import type { DailySaltSource } from './daily-salt-source.ts';

export type VisitorHasher = {
  derive(ipAddress: string, userAgent: string): Promise<string>;
};

export function createVisitorHasher(saltSource: DailySaltSource): VisitorHasher {
  return {
    derive: async (ipAddress, userAgent) => {
      const salt = await saltSource.currentSalt();
      return hashVisitor(salt, ipAddress, userAgent);
    },
  };
}

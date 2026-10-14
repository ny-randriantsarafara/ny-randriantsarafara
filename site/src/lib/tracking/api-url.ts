import { defaultApiUrl } from '@/lib/seo/content-security-policy.ts';

export function readTrackingApiUrl(): string {
  return defaultApiUrl().replace(/\/$/, '');
}

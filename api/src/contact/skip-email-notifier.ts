import type { ContactNotifier } from './contact-notifier.ts';

export function createSkipEmailNotifier(log: (message: string) => void): ContactNotifier {
  return {
    async notify(): Promise<void> {
      log('Contact email skipped: SMTP is not configured.');
    },
  };
}

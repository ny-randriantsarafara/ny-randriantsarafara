'use client';

import { iconRegistry } from '@/lib/icons';
import { trackContactClick } from '@/lib/tracking/track-event.ts';

import type { IconName } from '@/lib/icons';
import type { ContactChannelKind, ContactChannel } from '@/types';
import type { Locale } from '@portfolio/content';

type ContactChannelLinksProps = {
  locale: Locale;
  channels: ContactChannel[];
};

const channelIconByKind: Record<ContactChannelKind, IconName> = {
  email: 'mail',
  linkedin: 'arrow-up-right',
  github: 'arrow-up-right',
};

export function ContactChannelLinks({ locale, channels }: ContactChannelLinksProps) {
  return (
    <ul className="flex flex-col gap-6">
      {channels.map((channel) => {
        const Icon = iconRegistry[channelIconByKind[channel.kind]];
        const isExternal = channel.kind !== 'email';
        return (
          <li key={channel.href}>
            <a
              href={channel.href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="group flex items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-indigo)] focus-visible:ring-offset-2"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => trackContactClick(locale, channel.kind)}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-indigo-400 transition-colors group-hover:text-indigo-500"
                style={{
                  background: 'var(--tag-bg)',
                  border: '1px solid var(--tag-border)',
                }}
              >
                <Icon size={20} aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-1">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-dimmed)' }}
                >
                  {channel.kindLabel}
                </span>
                <span className="break-all text-base font-light">{channel.label}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

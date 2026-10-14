'use client';

import { BlockShell } from '@/components/chat/blocks/block-shell.tsx';
import { Button } from '@/components/ui';
import { trackContactClick } from '@/lib/tracking/track-event.ts';

import type { Dictionary } from '@/lib/i18n/dictionary.ts';
import type { Block, Locale, PublicationContent } from '@portfolio/content';

export function ContactBlockView({
  block,
  content,
  dictionary,
  layout,
  index,
  onOpenContact,
  locale,
}: {
  block: Extract<Block, { type: 'contact' }>;
  content: PublicationContent;
  locale: Locale;
  dictionary: Dictionary;
  layout: 'stage' | 'inline';
  index: number;
  onOpenContact?: (topic: string | undefined) => void;
}) {
  const profile = content.profile;
  const topic = block.topic;
  return (
    <BlockShell ariaLabel={dictionary.chat.blocks.contact} layout={layout} index={index}>
      <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {dictionary.chat.blocks.contactPrompt}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          href={`mailto:${profile.email}`}
          variant="primary"
          onClick={() => trackContactClick(locale, 'email')}
        >
          {dictionary.contact.channelEmail}
        </Button>
        <Button
          href={profile.linkedinUrl}
          variant="glass"
          external
          onClick={() => trackContactClick(locale, 'linkedin')}
        >
          {dictionary.contact.channelLinkedin}
        </Button>
        {onOpenContact !== undefined && (
          <Button type="button" variant="glass" onClick={() => onOpenContact(topic)}>
            {dictionary.chat.blocks.openContact}
          </Button>
        )}
      </div>
    </BlockShell>
  );
}
